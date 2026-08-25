"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useRef, useState } from "react";
import { fetchCourses } from "@/lib/courses-api";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { askCourseQuestion } from "@/lib/assistant-api";
import { ArrowUp } from "lucide-react";

export default function AssistantPage() {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [isCoursesLoading, setIsCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState("");
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatError, setChatError] = useState("");
  const messagesEndRef = useRef(null);
  const router = useRouter();

  const handleSendMessage = async () => {
    if (!selectedCourseId) return;
    if (!inputValue.trim()) return;
    if (isGenerating) return;
    
    const trimmedInput = inputValue.trim();
    
    const newUserMessage = {
      id: Date.now().toString(),
      role: "user",
      content: trimmedInput
    };
    
    setMessages(prevMessages => [...prevMessages, newUserMessage]);
    setInputValue("");
    setIsGenerating(true);
    setChatError("");
    
    const token = localStorage.getItem("access_token");
    
    try {
      const response = await askCourseQuestion(selectedCourseId, trimmedInput, token);
      
      const newAssistantMessage = {
        id: `${Date.now()}-assistant`,
        role: "assistant",
        content: response.answer,
        sources: response.sources || []
      };
      
      setMessages(prevMessages => [...prevMessages, newAssistantMessage]);
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        localStorage.removeItem("access_token");
        router.push("/login");
      } else {
        setChatError("Failed to get an answer. Please try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages, isGenerating]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    
    if (!token) {
      // Redirect to login page if no token
      router.push("/login");
      return;
    }

    const fetchCoursesData = async () => {
      try {
        const data = await fetchCourses(token);
        setCourses(data);
      } catch (err) {
        if (err.status === 401 || err.status === 403) {
          // Authentication error
          localStorage.removeItem("access_token");
          router.push("/login");
        } else {
          setCoursesError("Failed to load courses");
        }
      } finally {
        setIsCoursesLoading(false);
      }
    };

    fetchCoursesData();
  }, [router]);

  const handleCourseChange = (value) => {
    setSelectedCourseId(value);
  };

  return (
    <div className="flex flex-col h-dvh overflow-hidden">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6 min-h-0 overflow-hidden">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">AI Assistant</h1>
          <p className="text-muted-foreground">Ask questions about your course materials.</p>
        </div>

        <div className="flex flex-col flex-1 min-h-0 gap-4">
          {/* Conversation area */}
          <div className="flex-1 flex flex-col min-h-0">
            <Card className="flex-1 flex flex-col min-h-0">
              <CardContent className="flex-1 p-6 overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="text-center max-w-md mx-auto">
                    <h2 className="text-xl font-semibold mb-2">Ask anything about your course materials</h2>
                    <p className="text-muted-foreground">
                      Select a course and ask a question based on your uploaded materials.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] md:max-w-3xl p-4 rounded-lg whitespace-pre-wrap ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          {message.content}
                          {message.sources && message.sources.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-border">
                              <p className="text-sm font-medium mb-1">Sources</p>
                              <ul className="text-xs space-y-1">
                                {message.sources.map((source, index) => {
                                  const parts = [];
                                  
                                  if (source.file_name) {
                                    parts.push(source.file_name);
                                  }
                                  
                                  if (source.page_start || source.page_end) {
                                    if (source.page_start != null && source.page_end != null) {
                                      if (source.page_start === source.page_end) {
                                        parts.push(`Page ${source.page_start}`);
                                      } else {
                                        parts.push(`Pages ${source.page_start}–${source.page_end}`);
                                      }
                                    } else if (source.page_start != null) {
                                      parts.push(`Page ${source.page_start}`);
                                    } else if (source.page_end != null) {
                                      parts.push(`Page ${source.page_end}`);
                                    }
                                  }
                                  
                                  if (source.slide_number) {
                                    parts.push(`Slide ${source.slide_number}`);
                                  }
                                  
                                  if (source.section) {
                                    parts.push(`Section ${source.section}`);
                                  }
                                  
                                  return (
                                    <li key={index} className="text-muted-foreground">
                                      {parts.join(' · ')}
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {isGenerating && (
                      <div className="flex justify-start">
                        <div className="max-w-3xl p-4 rounded-lg bg-muted whitespace-pre-wrap">
                          Generating...
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Composer with course selector */}
            <div className="mt-4 rounded-2xl border bg-card shadow-sm p-3">
              <div className="flex flex-col gap-2">
                <Textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask a question about your course materials..."
                  className="min-h-[100px] border-0 bg-transparent shadow-none focus-visible:ring-0 resize-none w-full"
                  disabled={!selectedCourseId || isGenerating}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                {chatError && (
                  <p className="text-sm text-destructive">{chatError}</p>
                )}
                <div className="flex items-center justify-between gap-2">
                  {/* Course selector */}
                  <div className="flex-1">
                    {isCoursesLoading ? (
                      <Skeleton className="h-8 w-full" />
                    ) : coursesError ? (
                      <p className="text-sm text-destructive">{coursesError}</p>
                    ) : courses && courses.length > 0 ? (
                      <Select value={selectedCourseId} onValueChange={handleCourseChange}>
                        <SelectTrigger className="h-8 w-auto max-w-[70%] rounded-md text-sm">
                          <SelectValue placeholder="Select a course" />
                        </SelectTrigger>
                        <SelectContent>
                          {courses.map((course) => (
                            <SelectItem key={course.id} value={course.id}>
                              {course.code ? `${course.code} — ${course.name}` : course.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm text-muted-foreground">No courses available. Create a course and upload course material before asking questions.</p>
                    )}
                  </div>

                  <Button 
                    variant="default" 
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    disabled={!selectedCourseId || !inputValue.trim() || isGenerating}
                    onClick={handleSendMessage}
                    aria-label="Send message"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
