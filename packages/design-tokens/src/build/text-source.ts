export interface TextSource {
  read(): Promise<string>;
}
