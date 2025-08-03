import type { QuestionProps } from "../question";

export const validQuestion: QuestionProps = {
	id: "question-1",
	statement: "Test Question",
	choiceLength: 3,
	correctChoice: 0,
	explanation: "Test Explanation",
};

export const invalidQuestionWithEmptyId: QuestionProps = {
	...validQuestion,
	id: "",
};

export const invalidQuestionWithEmptyStatement: QuestionProps = {
	...validQuestion,
	statement: "",
};

export const invalidQuestionWithEmptyExplanation: QuestionProps = {
	...validQuestion,
	explanation: "",
};

export const invalidQuestionWithOutOfRangeCorrectChoice: QuestionProps = {
	...validQuestion,
	correctChoice: 3,
};
