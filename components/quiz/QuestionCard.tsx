import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuizQuestion } from "@/types/quiz";

interface QuestionCardProps {
  question: QuizQuestion;
  selectedAnswer?: number;
  onAnswerSelect: (optionIndex: number) => void;
  disabled?: boolean;
}

export function QuestionCard({ question, selectedAnswer, onAnswerSelect, disabled = false }: QuestionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{question.question}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {question.options.map((option, optionIndex) => {
            const isSelected = selectedAnswer === optionIndex;
            
            return (
              <Card
                key={optionIndex}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  disabled ? 'cursor-default opacity-60' : ''
                } ${
                  isSelected 
                    ? 'ring-1 ring-primary border-primary bg-primary/5' 
                    : 'hover:border-primary/50'
                }`}
                onClick={() => !disabled && onAnswerSelect(optionIndex)}
              >
                <CardContent>
                  <div className="flex items-center gap-5">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
                    }`}>
                      {isSelected && (
                        <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                      )}
                    </div>
                    <span className="font-medium text-base">{option}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}