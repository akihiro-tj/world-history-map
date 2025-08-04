import type { QuizContentProps } from "../quiz-content";

export const validQuizContent: QuizContentProps = {
	id: "quiz-1",
	title: "Test Quiz",
	questions: [
		{
			statement: "Question 1",
			choiceLength: 3,
			correctChoice: 0,
			explanation: "Explanation 1",
		},
	],
};

export const invalidQuizContentWithEmptyId: QuizContentProps = {
	...validQuizContent,
	id: "",
};

export const invalidQuizContentWithEmptyTitle: QuizContentProps = {
	...validQuizContent,
	title: "",
};

export const invalidQuizContentWithEmptyQuestions: QuizContentProps = {
	...validQuizContent,
	questions: [],
};
