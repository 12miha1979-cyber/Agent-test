const quizzes = new Map();

export function addQuiz(quiz) {
  quizzes.set(quiz.id, quiz);
  return quiz;
}

export function getQuiz(id) {
  return quizzes.get(id);
}
