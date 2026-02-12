import { type NextRequest, NextResponse } from "next/server";

// NYU Class Search API endpoint
const CLASS_SEARCH_API = "https://bulletins.nyu.edu/class-search/api/";

// Term codes
const TERM_CODES = [
    { "code": "1266", "name": "Summer 2026" },
    { "code": "1264", "name": "Spring 2026" },
    { "code": "1262", "name": "January 2026" },
    { "code": "1258", "name": "Fall 2025" },
    { "code": "1256", "name": "Summer 2025" },
    { "code": "1254", "name": "Spring 2025" },
    { "code": "1252", "name": "January 2025" },
    { "code": "1248", "name": "Fall 2024" },
    { "code": "1246", "name": "Summer 2024" },
    { "code": "1244", "name": "Spring 2024" },
];

interface ClassSearchResult {
    term_code: string;
    count: number;
    results: any[];
    error?: string;
}

async function fetchClassSections(courseCode: string, termCode: string): Promise<ClassSearchResult> {
    const payload = {
        other: { srcdb: termCode },
        criteria: [{ field: "keyword", value: courseCode }],
    };

    try {
        const response = await fetch(`${CLASS_SEARCH_API}?page=fose&route=search`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (response.ok) {
            const data = await response.json();
            if (data.fatal) {
                return { term_code: termCode, count: 0, results: [], error: data.fatal };
            }
            return {
                term_code: termCode,
                count: data.count || 0,
                results: data.results || [],
            };
        } else {
            return { term_code: termCode, count: 0, results: [], error: `API returned ${response.status}` };
        }
    } catch (error) {
        return { term_code: termCode, count: 0, results: [], error: String(error) };
    }
}

export async function searchNYUCourses(query: string) {
    // Try current/upcoming terms first
    // let's try Spring 2025 (1254) as default for now, or iterate.
    // The python script iterated. Let's iterate here too.

    for (const term of TERM_CODES) {
        const result = await fetchClassSections(query, term.code);
        if (result.count > 0) {
            return { ...result, term_name: term.name };
        }
    }

    return { results: [], count: 0, message: "No courses found." };
}
