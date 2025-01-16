"use client";

import { useState } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { UseCaseHeader } from "@/components/use-case/UseCaseHeader";
import { UseCaseContent } from "@/components/use-case/UseCaseContent";
import { CommentsDialog } from "@/components/use-case/CommentsDialog";
import { useUserSetup } from "@/hooks/templates/useUserSetup";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronDown, ChevronUp } from 'lucide-react';
import dynamic from 'next/dynamic';
import { MDEditorProps } from '@uiw/react-md-editor';
import DeploymentTab from '@/components/use-case/Deploymenttab';

// Dynamically import MDEditor to avoid SSR issues
const MDEditor = dynamic<MDEditorProps>(
  () => import('@uiw/react-md-editor').then((mod) => mod.default),
  { ssr: false }
);

const MDMarkdown = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default.Markdown),
  { ssr: false }
);

interface UseCaseDetailPageProps {
  params: {
    useCaseId: string;
  };
}

export default function TemplateDetailPage({ params }: UseCaseDetailPageProps) {
  
  const [showComments, setShowComments] = useState(false);
  const [showImplementation, setShowImplementation] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [activeTab, setActiveTab] = useState("implementation");
  const [showBenefits, setShowBenefits] = useState(false);
  const { convexUserId, isAuthenticated } = useUserSetup();

  // Query hooks
  const useCase = useQuery(api.useCases.getUseCase, { 
    id: params.useCaseId as Id<"useCases"> 
  });
  const comments = useQuery(api.useCases.listComments);
  const likes = useQuery(api.useCases.listLikes);
  const users = useQuery(api.users.listUsers);
  
  // Mutation hooks
  const likeUseCase = useMutation(api.useCases.likeUseCase);
  const addComment = useMutation(api.useCases.addComment);

  // Event handlers
  const handleLike = async () => {
    if (!isAuthenticated || !convexUserId || !useCase) return;
    await likeUseCase({ useCaseId: useCase._id, userId: convexUserId });
  };

  const handleComment = async () => {
    if (!isAuthenticated || !convexUserId || !newComment.trim() || !useCase) return;
    await addComment({ 
      useCaseId: useCase._id, 
      userId: convexUserId, 
      text: newComment.trim(),
      timestamp: new Date().toISOString() 
    });
    setNewComment("");
  };

  // Derived values
  const filteredComments = comments?.filter(
    comment => comment.useCaseId === params.useCaseId
  ) || [];
  const filteredLikes = likes?.filter(
    like => like.useCaseId === params.useCaseId
  ) || [];

  if (!useCase || !comments || !likes || !users) {
    return (
      <div className="relative z-20 flex min-h-screen items-center justify-center">
        <div className="text-zinc-100 mt-10">Loading...</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="relative z-20 max-w-8xl mx-auto">
        <UseCaseHeader />
        <UseCaseContent
          useCase={useCase}
          likes={filteredLikes.length}
          comments={filteredComments.length}
          onLike={handleLike}
          onShowComments={() => setShowComments(true)}
        />
        
        <CommentsDialog
          isOpen={showComments}
          onClose={() => setShowComments(false)}
          comments={filteredComments}
          users={users}
          useCaseTitle={useCase.title}
          newComment={newComment}
          onCommentChange={setNewComment}
          onSubmitComment={handleComment}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="relative z-20 mt-8">
          <TabsList className="bg-blue-900/20 border border-zinc-800">
            <TabsTrigger 
              value="implementation" 
              className="data-[state=active]:bg-primary text-zinc-300"
            >
              Implementation
            </TabsTrigger>
            <TabsTrigger 
              value="deployment"
              className="data-[state=active]:bg-primary text-zinc-300"
            >
              Deployment
            </TabsTrigger>
          </TabsList>

          <TabsContent value="implementation">
            <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800 backdrop-blur-sm">
              <CardHeader className="border-b border-zinc-800">
                <CardTitle className="text-2xl font-bold text-zinc-100">
                  Implementation Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Button
                    variant="outline"
                    className="relative w-full flex items-center justify-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 border-blue-500/20 text-zinc-200"
                    onClick={() => setShowImplementation(!showImplementation)}
                  >
                    {showImplementation ? (
                      <>
                        Hide Implementation Details
                        <ChevronUp className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Show Implementation Details
                        <ChevronDown className="h-4 w-4" />
                      </>
                    )}
                  </Button>

                  {showImplementation && (
                    <div 
                      className="relative text-zinc-300 bg-blue-900/20 rounded-lg p-4 border border-zinc-800" 
                      data-color-mode="dark"
                    >
                      {useCase.implementation ? (
                        <MDMarkdown
                          source={useCase.implementation} 
                          style={{ 
                            backgroundColor: 'transparent',
                            color: 'rgb(228 228 231)',
                            padding: '1rem'
                          }}
                        />
                      ) : (
                        <p>No implementation details available.</p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deployment">
            <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800 backdrop-blur-sm">
              <CardHeader className="border-b border-zinc-800">
                <CardTitle className="text-2xl font-bold text-zinc-100">
                  Contract Deployment
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="bg-blue-900/20 border border-zinc-800 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-zinc-200 mb-2">
                      Important Notes:
                    </h3>
                    <ul className="list-disc list-inside text-zinc-300 space-y-2">
                      <li>Ensure your Destination contract includes the AbstractCallback interface</li>
                      <li>Constructor must be payable and include Callback_sender parameter</li>
                      <li>Minimum 0.1 native tokens required for successful callbacks</li>
                    </ul>
                  </div>

                  <DeploymentTab 
                    reactiveTemplate={useCase.reactiveTemplate}
                    originContract={useCase.originContract}
                    originABI={useCase.originABI}
                    originBytecode={useCase.originBytecode}
                    destinationContract={useCase.destinationContract}
                    destinationABI={useCase.destinationABI}
                    destinationBytecode={useCase.destinationBytecode}
                    reactiveABI={useCase.reactiveABI}
                    reactiveBytecode={useCase.reactiveBytecode}
                    helperContracts={useCase.helperContracts}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="relative z-20 bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-800 mt-8 backdrop-blur-sm">
          <CardHeader className="border-b border-zinc-800">
            <CardTitle className="text-2xl font-bold text-zinc-100">
              Benefits and Use Cases
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Button
                variant="outline"
                className="relative w-full flex items-center justify-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 border-blue-500/20 text-zinc-200"
                onClick={() => setShowBenefits(!showBenefits)}
              >
                {showBenefits ? (
                  <>
                    Hide Benefits and Use Cases
                    <ChevronUp className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Show Benefits and Use Cases
                    <ChevronDown className="h-4 w-4" />
                  </>
                )}
              </Button>

              {showBenefits && (
                <div className="space-y-6">
                  <div className="bg-blue-900/20 rounded-lg p-4 border border-zinc-800">
                    <h3 className="text-xl font-semibold text-zinc-100 mb-3">
                      Key Benefits
                    </h3>
                    <ul className="list-disc list-inside text-zinc-300 space-y-2">
                      <li>Automated cross-chain operations</li>
                      <li>Enhanced security and reliability</li>
                      <li>Reduced operational complexity</li>
                      <li>Cost-effective deployment</li>
                    </ul>
                  </div>
                  
                  <div className="bg-blue-900/20 rounded-lg p-4 border border-zinc-800">
                    <h3 className="text-xl font-semibold text-zinc-100 mb-3">
                      Ideal Use Cases
                    </h3>
                    <ul className="list-disc list-inside text-zinc-300 space-y-2">
                      <li>Cross-chain token bridges</li>
                      <li>Multi-chain DeFi applications</li>
                      <li>Decentralized exchange integrations</li>
                      <li>Cross-chain governance systems</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}