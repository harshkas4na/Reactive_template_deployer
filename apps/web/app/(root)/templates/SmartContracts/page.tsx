"use client";

import { useState } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { UseCaseCard } from '@/components/use-case/UseCaseCard';
import { CommentDialog } from '@/components/use-case/CommentDialog';
import { useConvexUser } from '@/hooks/templates/useConvexUser';
import { Id } from '@/convex/_generated/dataModel';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Grid, List } from 'lucide-react';

export default function UseCasesPage() {
  const { convexUserId, isAuthenticated } = useConvexUser();
  const useCases = useQuery(api.useCases.listUseCases);
  const comments = useQuery(api.useCases.listComments);
  const likes = useQuery(api.useCases.listLikes);
  const users = useQuery(api.users.listUsers);
  const likeUseCase = useMutation(api.useCases.likeUseCase);
  const addComment = useMutation(api.useCases.addComment);

  const [selectedUseCase, setSelectedUseCase] = useState<Id<"useCases"> | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [complexityFilter, setComplexityFilter] = useState('all');

  const handleLike = async (useCaseId: Id<"useCases">) => {
    if (!isAuthenticated || !convexUserId) return;
    await likeUseCase({ useCaseId, userId: convexUserId });
  };

  const handleAddComment = async (text: string) => {
    if (!isAuthenticated || !convexUserId || !selectedUseCase) return;
    await addComment({ useCaseId: selectedUseCase, userId: convexUserId, text });
  };

  const filteredUseCases = useCases?.filter(useCase => 
    useCase.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (categoryFilter === 'all' || useCase.category === categoryFilter) &&
    (complexityFilter === 'all' || useCase.complexity === complexityFilter)
  ) || [];

  if (!useCases || !comments || !likes || !users) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-12 text-gray-100">
          Reactive Smart Contracts Library
        </h1>
        
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex-1 w-full sm:w-auto">
            <Input 
              type="search" 
              placeholder="Search use cases..." 
              className="w-full" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="defi">DeFi</SelectItem>
                <SelectItem value="nft">NFT</SelectItem>
                <SelectItem value="dao">DAO</SelectItem>
              </SelectContent>
            </Select>
            <Select value={complexityFilter} onValueChange={setComplexityFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Complexity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => setViewMode('grid')}>
              <Grid className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setViewMode('list')}>
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8' : 'space-y-8'}>
          {filteredUseCases.map((useCase) => (
            <UseCaseCard
              key={useCase._id}
              useCase={useCase}
              comments={comments}
              likes={likes}
              onLike={handleLike}
              onComment={(useCaseId) => setSelectedUseCase(useCaseId)}
            />
          ))}
        </div>
      </div>

      <CommentDialog
        useCase={useCases.find(uc => uc._id === selectedUseCase)}
        comments={comments.filter(comment => comment.useCaseId === selectedUseCase)}
        users={users}
        isOpen={!!selectedUseCase}
        onClose={() => setSelectedUseCase(null)}
        onAddComment={handleAddComment}
      />
    </div>
  );
}