import { Choice } from "./choice";

export interface QuestionProps {
	id: string;
	statement: string;
	choiceLength: number;
	correctChoice: number;
	explanation: string;
}

export class Question {
	private readonly id: string;
	private readonly statement: string;
	private readonly choices: Choice[];
	private readonly correctChoice: Choice;
	private readonly explanation: string;

	private constructor(
		id: string,
		statement: string,
		choices: Choice[],
		correctChoice: Choice,
		explanation: string,
	) {
		if (!id) {
			throw new Error("Question id must not be empty");
		}
		if (!statement) {
			throw new Error("Question statement must not be empty");
		}
		if (!explanation) {
			throw new Error("Question explanation must not be empty");
		}

		this.id = id;
		this.statement = statement;
		this.choices = choices;
		this.correctChoice = correctChoice;
		this.explanation = explanation;
	}

	static create(props: QuestionProps): Question {
		const choices = Array.from({ length: props.choiceLength }, (_, index) =>
			Choice.create({
				id: `${props.id}-${index}`,
				text: String.fromCharCode(65 + index), // A, B, C, ...
			}),
		);
		const correctChoice = choices[props.correctChoice];
		if (!correctChoice) {
			throw new Error("Correct choice must be within choices range");
		}
		return new Question(
			props.id,
			props.statement,
			choices,
			correctChoice,
			props.explanation,
		);
	}

	getId(): string {
		return this.id;
	}

	getStatement(): string {
		return this.statement;
	}

	getChoices(): Choice[] {
		return [...this.choices];
	}

	getCorrectChoice(): Choice {
		return this.correctChoice;
	}

	getExplanation(): string {
		return this.explanation;
	}
}
