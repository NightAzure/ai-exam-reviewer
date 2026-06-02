import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, XCircle, ArrowLeft, ArrowRight, RotateCcw, HelpCircle } from "lucide-react";
import { Quiz } from "@/types/quiz";

interface QuizCompletionProps {
  quiz: Quiz;
  selectedAnswers: Record<number, number>;
  currentQuestionIndex: number;
  onQuestionSelect: (index: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  onRestart: () => void;
}

export function QuizCompletion({
  quiz,
  selectedAnswers,
  currentQuestionIndex,
  onQuestionSelect,
  onPrevious,
  onNext,
  onRestart
}: QuizCompletionProps) {
  const score = quiz.questions.filter((question) => 
    selectedAnswers[question.id] === question.correctAnswer
  ).length;
  const percentage = Math.round((score / quiz.questions.length) * 100);
  const currentQuestion = quiz.questions[currentQuestionIndex];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Quiz Completed!</CardTitle>
          <CardDescription className="text-lg">{quiz.title}</CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          {/* Score Display */}
          <div className="inline-flex flex-col items-center justify-center w-32 h-32 bg-gradient-to-br from-primary/20 to-primary/30 rounded-full">
            <div className="text-4xl font-bold text-primary">{percentage}%</div>
            <div className="text-sm text-muted-foreground">Your Score</div>
          </div>
          
          <p className="text-xl">
            You got <span className="font-bold text-green-600">{score}</span> out of{" "}
            <span className="font-bold">{quiz.questions.length}</span> questions correct
          </p>

          <Separator />

          {/* Review Section */}
          <div className="text-left">
            <h3 className="text-xl font-semibold mb-4">Review Your Answers</h3>
            
            {/* Question Navigation Grid */}
            <div className="flex flex-wrap gap-2 mb-6">
              {quiz.questions.map((_, index) => {
                const question = quiz.questions[index];
                const isCorrect = selectedAnswers[question.id] === question.correctAnswer;
                const isViewing = index === currentQuestionIndex;
                
                return (
                  <Button
                    key={index}
                    variant={isViewing ? "default" : "outline"}
                    size="sm"
                    className={`w-10 h-10 p-0 ${
                      isCorrect
                        ? 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200'
                        : 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200'
                    } ${isViewing ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                    onClick={() => onQuestionSelect(index)}
                  >
                    {index + 1}
                  </Button>
                );
              })}
            </div>

            {/* Current Question Review */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">
                  Question {currentQuestionIndex + 1} of {quiz.questions.length}
                </CardTitle>
                <Badge variant={selectedAnswers[currentQuestion.id] === currentQuestion.correctAnswer ? "default" : "destructive"}>
                  {selectedAnswers[currentQuestion.id] === currentQuestion.correctAnswer ? (
                    <><CheckCircle className="w-3 h-3 mr-1" /> Correct</>
                  ) : (
                    <><XCircle className="w-3 h-3 mr-1" /> Incorrect</>
                  )}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-lg font-medium">{currentQuestion.question}</p>
                
                {/* Answer Options */}
                <div className="space-y-3">
                  {currentQuestion.options.map((option, optionIndex) => {
                    const isSelected = selectedAnswers[currentQuestion.id] === optionIndex;
                    const isCorrect = optionIndex === currentQuestion.correctAnswer;
                    
                    let cardClass = "p-4 border-2 transition-all cursor-default ";
                    
                    if (isCorrect) {
                      cardClass += "border-green-500 bg-green-50 text-green-900";
                    } else if (isSelected && !isCorrect) {
                      cardClass += "border-red-500 bg-red-50 text-red-900";
                    } else {
                      cardClass += "border-muted bg-muted/30 opacity-60";
                    }

                    return (
                      <div key={optionIndex} className={cardClass + " rounded-lg"}>
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            isCorrect ? 'border-green-500 bg-green-500' :
                            isSelected && !isCorrect ? 'border-red-500 bg-red-500' :
                            'border-gray-400'
                          }`}>
                            {(isSelected || isCorrect) && (
                              <div className="w-2 h-2 rounded-full bg-white"></div>
                            )}
                          </div>
                          <span className="font-medium">{option}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                <Alert>
                  <HelpCircle className="h-4 w-4" />
                  <AlertDescription>
                    <span className="font-semibold">Explanation:</span> {currentQuestion.explanation}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Footer */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={currentQuestionIndex === 0}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        
        <Button onClick={onRestart} className="px-8">
          <RotateCcw className="w-4 h-4 mr-2" />
          Take Quiz Again
        </Button>
        
        <Button
          variant="outline"
          onClick={onNext}
          disabled={currentQuestionIndex === quiz.questions.length - 1}
        >
          Next
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
