import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Quiz } from "@/types/quiz";
type QuizHeaderProps = {
    quiz: Quiz;
    currentQuestionIndex: number;
    answeredCount: number;
}

const getDifficultyBadge = (difficulty: string) => {
  const variants = {
    easy: "default" as const,
    medium: "secondary" as const,
    hard: "destructive" as const
  };
  return variants[difficulty as keyof typeof variants] || "default";
};


export function QuizHeader({quiz,currentQuestionIndex, answeredCount}: QuizHeaderProps){
    const progressPercentage = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;
    return (
         <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <CardTitle className="text-xl">{quiz.title}</CardTitle>
                <CardDescription className="text-base">{quiz.description}</CardDescription>
              </div>
              <div className="text-right space-y-1">
                <div className="text-sm text-muted-foreground">Progress</div>
                <div className="text-xl font-bold">
                  {currentQuestionIndex + 1} / {quiz.questions.length}
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <Progress value={progressPercentage} className="h-2" />
              
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>Difficulty:</span>
                  <Badge variant={getDifficultyBadge(quiz.difficulty)}>
                    {quiz.difficulty}
                  </Badge>
                </div>
                <Separator orientation="vertical" className="h-4" />
                <span>Time: {quiz.estimatedTime}</span>
                <Separator orientation="vertical" className="h-4" />
                <span>Answered: {answeredCount}/{quiz.questions.length}</span>
              </div>
            </div>
          </CardHeader>
        </Card>
    )
}