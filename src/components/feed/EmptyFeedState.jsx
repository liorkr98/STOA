import React from "react";
import { FileSearch } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EmptyFeedState({ onClearFilters }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
        <FileSearch className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="font-medium text-base mb-1">No reports found</h3>
      <p className="text-sm text-muted-foreground mb-4">Try adjusting your filters to see more results.</p>
      {onClearFilters && (
        <Button variant="outline" size="sm" onClick={onClearFilters}>
          Clear Filters
        </Button>
      )}
    </div>
  );
}