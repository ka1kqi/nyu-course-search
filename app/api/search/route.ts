import { type NextRequest, NextResponse } from "next/server";
import { searchNYUCourses } from "@/lib/nyu-api";
import { createClient } from "@/utils/supabase/server";

// Nomic API setup
const NOMIC_API_KEY = process.env.NOMIC_API_KEY;

async function generateEmbedding(text: string) {
    if (!NOMIC_API_KEY) throw new Error("Missing NOMIC_API_KEY");

    const response = await fetch("https://api-atlas.nomic.ai/v1/embedding/text", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${NOMIC_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "nomic-embed-text-v1.5",
            task_type: "search_query",
            texts: [text]
        })
    });

    if (!response.ok) {
        throw new Error(`Nomic API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.embeddings[0]; // Returns array of dimensions
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query");

    if (!query) {
        return NextResponse.json({ error: "Query parameter is required" }, { status: 400 });
    }

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        // Log search history
        if (user) {
            await supabase.from("search_history").insert({
                user_id: user.id,
                query: query,
            });
        }

        // Hybrid Search Logic
        // 1. Detect if it looks like a course code (e.g., "CS-UY 1114", "CSCI-UA", "MATH 101")
        const courseCodeRegex = /^[A-Za-z]{2,}-\w{2,}\s*\d{0,4}$|^[A-Za-z]{2,}\s*\d{2,4}$/i;
        const isCourseCode = courseCodeRegex.test(query.trim());

        if (isCourseCode) {
            console.log(`Direct API search for: ${query}`);
            const data = await searchNYUCourses(query);
            return NextResponse.json({
                courses: data.results.map((c: any) => ({
                    id: c.key || c.crn,
                    course_code: c.code,
                    title: c.title,
                    description: c.description || "",
                    similarity: 1,
                    location: c.location || "",
                    instructor: c.instr || "",
                    schedule: c.meets || ""
                }))
            });
        }

        // 2. Semantic/Vector Search
        console.log(`Vector search for: ${query}`);
        const embedding = await generateEmbedding(query);

        const { data: courses, error } = await supabase.rpc("match_courses", {
            query_embedding: embedding,
            match_threshold: 0.3, // Adjust as needed
            match_count: 20
        });

        if (error) throw error;

        return NextResponse.json({
            courses: courses?.map((c: any) => ({
                id: c.id,
                course_code: c.course_code,
                title: c.title,
                description: c.description,
                similarity: c.similarity,
                // Metadata isn't always returned by match_courses unless requested, assuming basic fields for now
                // location/instructor might need to be in metadata or separate columns if we want them in vector results
                // For now, these might be empty for vector results unless we updated the schema/RPC
                location: "",
                instructor: "",
                schedule: ""
            })) || []
        });

    } catch (err) {
        console.error("Search error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
