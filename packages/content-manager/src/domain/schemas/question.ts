import { z } from "zod";

export const questionSchema = z.object({
	statement: z.string(),
	choiceLength: z.number().int(),
	correctChoice: z.number().int(),
	explanation: z.string(),
});
