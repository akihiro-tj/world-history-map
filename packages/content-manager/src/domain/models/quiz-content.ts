import { Question } from "./question";

export interface QuizContentProps {
	id: string;
	title: string;
	questions: QuestionData[];
}

interface QuestionData {
	statement: string;
	choiceLength: number;
	correctChoice: number;
	explanation: string;
}

export class QuizContent {
	private readonly id: string;
	private readonly title: string;
	private readonly questions: Question[];

	private constructor(id: string, title: string, questions: Question[]) {
		if (!id) {
			throw new Error("Quiz content id must not be empty");
		}
		if (!title) {
			throw new Error("Quiz content title must not be empty");
		}
		if (questions.length === 0) {
			throw new Error("Quiz content must have at least one question");
		}

		this.id = id;
		this.title = title;
		this.questions = questions;
	}

	static create(props: QuizContentProps): QuizContent {
		const questions = props.questions.map((question, index) => {
			return Question.create({
				id: `${props.id}-${index}`,
				statement: question.statement,
				choiceLength: question.choiceLength,
				correctChoice: question.correctChoice,
				explanation: question.explanation,
			});
		});
		return new QuizContent(props.id, props.title, questions);
	}

	getId(): string {
		return this.id;
	}

	getTitle(): string {
		return this.title;
	}

	getQuestions(): Question[] {
		return [...this.questions];
	}

	getTotalQuestions(): number {
		return this.questions.length;
	}
}
