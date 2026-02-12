import SearchInterface from "@/components/SearchInterface";

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
      <SearchInterface />
    </div>
  );
}
