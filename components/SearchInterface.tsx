"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Search, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function SearchInterface() {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setHasSearched(true);
        setResults([]); // Clear previous results

        try {
            const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
            const data = await response.json();
            setResults(data.courses || []);
        } catch (error) {
            console.error("Search failed:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-8">
            <div className="space-y-4 text-center">
                <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl text-primary drop-shadow-sm">
                    Discover NYU Courses
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    Search for classes using keywords or course codes. Try "Computer Science" or "CSCI-UA".
                </p>
            </div>

            <form onSubmit={handleSearch} className="flex gap-2 relative">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input
                        placeholder="What do you want to learn?"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="pl-10 h-12 text-lg shadow-sm"
                    />
                </div>
                <Button type="submit" size="lg" disabled={loading} className="h-12 px-8 shadow-md transition-all hover:scale-105">
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Search"}
                </Button>
            </form>

            <div className="space-y-4">
                <AnimatePresence>
                    {results.length > 0 ? (
                        results.map((course, index) => (
                            <motion.div
                                key={course.id || index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-primary/20">
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-xl font-bold text-primary">
                                                    {course.course_code}
                                                </CardTitle>
                                                <CardDescription className="text-lg text-foreground font-medium mt-1">
                                                    {course.title}
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex flex-col gap-1 mb-3 text-sm">
                                            {course.instructor && (
                                                <div className="flex gap-2">
                                                    <span className="font-semibold text-muted-foreground w-20">Instructor:</span>
                                                    <span>{course.instructor}</span>
                                                </div>
                                            )}
                                            {course.schedule && (
                                                <div className="flex gap-2">
                                                    <span className="font-semibold text-muted-foreground w-20">Schedule:</span>
                                                    <span>{course.schedule}</span>
                                                </div>
                                            )}
                                            {course.location && (
                                                <div className="flex gap-2">
                                                    <span className="font-semibold text-muted-foreground w-20">Location:</span>
                                                    <span>{course.location}</span>
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-muted-foreground leading-relaxed">
                                            {course.description || "No description available."}
                                        </p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))
                    ) : hasSearched && !loading ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-12 text-muted-foreground"
                        >
                            No courses found. Try a different query.
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </div>
        </div>
    );
}
