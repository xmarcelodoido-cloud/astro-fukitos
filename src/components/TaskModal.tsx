import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { Task } from "@/lib/api";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onStartTasks: (tasks: Task[], isDraft: boolean, minTime: number, maxTime: number) => void;
}

interface TaskWithScore extends Task {
  selected: boolean;
  score: number;
}

export function TaskModal({ isOpen, onClose, tasks, onStartTasks }: TaskModalProps) {
  const [tasksWithScore, setTasksWithScore] = useState<TaskWithScore[]>([]);
  const [minTime, setMinTime] = useState(1);
  const [maxTime, setMaxTime] = useState(2);
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    setTasksWithScore(
      tasks.map(task => ({
        ...task,
        selected: false,
        score: 100
      }))
    );
    setSelectAll(false);
  }, [tasks]);

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    setTasksWithScore(prev =>
      prev.map(task => ({ ...task, selected: checked }))
    );
  };

  const handleTaskToggle = (taskId: number) => {
    setTasksWithScore(prev => {
      const updated = prev.map(task =>
        task.id === taskId ? { ...task, selected: !task.selected } : task
      );
      const allSelected = updated.every(t => t.selected);
      const someSelected = updated.some(t => t.selected);
      setSelectAll(allSelected && someSelected);
      return updated;
    });
  };

  const handleScoreChange = (taskId: number, score: number) => {
    setTasksWithScore(prev =>
      prev.map(task =>
        task.id === taskId ? { ...task, score } : task
      )
    );
  };

  const handleStartSelected = (isDraft: boolean) => {
    const selectedTasks = tasksWithScore.filter(t => t.selected);
    if (selectedTasks.length === 0) return;
    onStartTasks(selectedTasks, isDraft, minTime, maxTime);
  };

  const handleStartAll = () => {
    const allTasks = tasksWithScore.map(t => ({ ...t, score: 100 }));
    onStartTasks(allTasks, false, minTime, maxTime);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-card border border-border rounded-xl p-6 w-full max-w-md card-shadow relative"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-center mb-5 relative">
              <h2 className="text-xl font-semibold text-primary-foreground">Selecionar Lições</h2>
              <button
                onClick={onClose}
                className="absolute right-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-secondary rounded-lg p-3 mb-5 border border-border">
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={selectAll}
                  onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                />
                <span className="text-foreground font-medium">Selecionar Todas as Lições</span>
              </label>
            </div>

            <div className="bg-secondary rounded-lg border border-border max-h-[40vh] overflow-y-auto mb-5">
              {tasksWithScore.length === 0 ? (
                <p className="text-center text-muted-foreground py-5">Nenhuma lição encontrada.</p>
              ) : (
                tasksWithScore.map(task => (
                  <div
                    key={task.id}
                    onClick={() => handleTaskToggle(task.id)}
                    className="flex items-center p-3 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <Checkbox
                      checked={task.selected}
                      onCheckedChange={() => handleTaskToggle(task.id)}
                      className="mr-3"
                    />
                    <span className="flex-1 text-sm text-foreground">{task.title}</span>
                    <select
                      value={task.score}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleScoreChange(task.id, parseInt(e.target.value));
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-secondary border border-border rounded-md text-foreground py-1 px-2 text-sm font-poppins"
                    >
                      <option value={100}>100%</option>
                      <option value={90}>90%</option>
                      <option value={80}>80%</option>
                      <option value={70}>70%</option>
                      <option value={60}>60%</option>
                      <option value={50}>50%</option>
                    </select>
                  </div>
                ))
              )}
            </div>

            <div className="mb-5">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="minTime" className="text-foreground font-medium">
                    Tempo Mínimo (min)
                  </Label>
                  <Input
                    id="minTime"
                    type="number"
                    value={minTime}
                    onChange={(e) => setMinTime(parseInt(e.target.value) || 1)}
                    min={0}
                    max={60}
                    className="w-20 bg-transparent border-border text-center"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="maxTime" className="text-foreground font-medium">
                    Tempo Máximo (min)
                  </Label>
                  <Input
                    id="maxTime"
                    type="number"
                    value={maxTime}
                    onChange={(e) => setMaxTime(parseInt(e.target.value) || 2)}
                    min={1}
                    max={60}
                    className="w-20 bg-transparent border-border text-center"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                onClick={() => handleStartSelected(false)}
                disabled={!tasksWithScore.some(t => t.selected)}
                className="w-full bg-secondary hover:bg-muted text-secondary-foreground border border-border font-semibold"
              >
                Fazer Lições Selecionadas
              </Button>
              <Button
                onClick={() => handleStartSelected(true)}
                disabled={!tasksWithScore.some(t => t.selected)}
                className="w-full bg-secondary hover:bg-muted text-secondary-foreground border border-border font-semibold"
              >
                Fazer Lições Selecionadas como Rascunho
              </Button>
              <Button
                onClick={handleStartAll}
                disabled={tasksWithScore.length === 0}
                className="w-full bg-secondary hover:bg-muted text-secondary-foreground border border-border font-semibold"
              >
                Fazer Todas as Lições
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
