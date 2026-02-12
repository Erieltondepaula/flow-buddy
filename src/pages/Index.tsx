import { useState, useCallback, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import ChatPanel from "@/components/ChatPanel";
import ConversationList from "@/components/ConversationList";
import KnowledgeBase from "@/components/KnowledgeBase";
import CommonErrors from "@/components/CommonErrors";
import SolutionHistory from "@/components/SolutionHistory";
import TicketsPanel from "@/components/TicketsPanel";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [activeTab, setActiveTab] = useState("chat");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Auto-select last active (non-resolved) conversation on load
  useEffect(() => {
    const loadLastActive = async () => {
      const { data } = await supabase
        .from("conversations")
        .select("id")
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        setActiveConversationId(data[0].id);
      }
    };
    loadLastActive();
  }, []);

  const handleConversationCreated = useCallback((id: string) => {
    setActiveConversationId(id);
    // Trigger conversation list refresh
    (window as any).__refetchConversations?.();
  }, []);

  const handleConversationUpdated = useCallback(() => {
    (window as any).__refetchConversations?.();
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case "chat":
        return (
          <div className="flex h-full">
            <ConversationList
              activeConversationId={activeConversationId}
              onSelectConversation={setActiveConversationId}
            />
            <div className="flex-1">
              <ChatPanel
                key={activeConversationId || "new"}
                conversationId={activeConversationId}
                onConversationCreated={handleConversationCreated}
                onConversationUpdated={handleConversationUpdated}
              />
            </div>
          </div>
        );
      case "tickets":
        return <TicketsPanel />;
      case "knowledge":
        return <KnowledgeBase />;
      case "errors":
        return <CommonErrors />;
      case "history":
        return <SolutionHistory />;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 ml-72 h-screen overflow-hidden">
        {renderContent()}
      </main>
    </div>
  );
};

export default Index;
