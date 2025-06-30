import { Lexer, TokenType } from "../src/Lexer";

describe("Lexer", () => {
  test("should tokenize empty input", () => {
    const lexer = new Lexer("");
    const tokens = lexer.scanTokens();
    expect(tokens.length).toBe(1);
    expect(tokens[0].type).toBe(TokenType.EOF);
  });

  test("should tokenize basic tokens", () => {
    const lexer = new Lexer("{}();+-*/=<>==");
    const tokens = lexer.scanTokens();

    expect(tokens.length).toBe(14);

    expect(tokens[0].type).toBe(TokenType.LEFT_BRACE);
    expect(tokens[1].type).toBe(TokenType.RIGHT_BRACE);
    expect(tokens[2].type).toBe(TokenType.LEFT_PAREN);
    expect(tokens[3].type).toBe(TokenType.RIGHT_PAREN);
    expect(tokens[4].type).toBe(TokenType.SEMICOLON);
    expect(tokens[5].type).toBe(TokenType.PLUS);
    expect(tokens[6].type).toBe(TokenType.MINUS);
    expect(tokens[7].type).toBe(TokenType.MULTIPLY);
    expect(tokens[8].type).toBe(TokenType.DIVIDE);
    expect(tokens[9].type).toBe(TokenType.EQUAL);
    expect(tokens[10].type).toBe(TokenType.LESS_THAN);
    expect(tokens[11].type).toBe(TokenType.GREATER_THAN);
    expect(tokens[12].type).toBe(TokenType.EQUAL_EQUAL);
    expect(tokens[13].type).toBe(TokenType.EOF);
  });

  test("should tokenize keywords", () => {
    const lexer = new Lexer("int return if else");
    const tokens = lexer.scanTokens();

    expect(tokens.length).toBe(5); // 4 keywords + EOF
    expect(tokens[0].type).toBe(TokenType.INT);
    expect(tokens[1].type).toBe(TokenType.RETURN);
    expect(tokens[2].type).toBe(TokenType.IF);
    expect(tokens[3].type).toBe(TokenType.ELSE);
  });

  test("should tokenize identifiers", () => {
    const lexer = new Lexer("foo bar baz");
    const tokens = lexer.scanTokens();

    expect(tokens.length).toBe(4); // 3 identifiers + EOF
    expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[0].lexeme).toBe("foo");
    expect(tokens[1].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[1].lexeme).toBe("bar");
    expect(tokens[2].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[2].lexeme).toBe("baz");
  });

  test("should tokenize numbers", () => {
    const lexer = new Lexer("123 456 789");
    const tokens = lexer.scanTokens();

    expect(tokens.length).toBe(4); // 3 numbers + EOF
    expect(tokens[0].type).toBe(TokenType.NUMBER);
    expect(tokens[0].literal).toBe(123);
    expect(tokens[1].type).toBe(TokenType.NUMBER);
    expect(tokens[1].literal).toBe(456);
    expect(tokens[2].type).toBe(TokenType.NUMBER);
    expect(tokens[2].literal).toBe(789);
  });

  test("should handle whitespace correctly", () => {
    const lexer = new Lexer("  int  \n  main  \t  (  )  ");
    const tokens = lexer.scanTokens();

    expect(tokens.length).toBe(5); // int, main, (, ), EOF
    expect(tokens[0].type).toBe(TokenType.INT);
    expect(tokens[1].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[1].lexeme).toBe("main");
    expect(tokens[2].type).toBe(TokenType.LEFT_PAREN);
    expect(tokens[3].type).toBe(TokenType.RIGHT_PAREN);
  });

  test("should track line numbers", () => {
    const lexer = new Lexer("int\nmain\n(\n)\n{");
    const tokens = lexer.scanTokens();

    expect(tokens[0].line).toBe(1); // int
    expect(tokens[1].line).toBe(2); // main
    expect(tokens[2].line).toBe(3); // (
    expect(tokens[3].line).toBe(4); // )
    expect(tokens[4].line).toBe(5); // {
  });

  test("should tokenize a complete function", () => {
    const input = `
      int main() {
        int x = 5;
        if (x > 3) {
          return x * 2;
        } else {
          return 0;
        }
      }
    `;

    const lexer = new Lexer(input);
    const tokens = lexer.scanTokens();

    expect(tokens.length).toBe(31);

    const types = tokens.map((t) => t.type);
    expect(types).toContain(TokenType.INT);
    expect(types).toContain(TokenType.IDENTIFIER);
    expect(types).toContain(TokenType.LEFT_PAREN);
    expect(types).toContain(TokenType.RIGHT_PAREN);
    expect(types).toContain(TokenType.LEFT_BRACE);
    expect(types).toContain(TokenType.IF);
    expect(types).toContain(TokenType.ELSE);
    expect(types).toContain(TokenType.GREATER_THAN);
    expect(types).toContain(TokenType.MULTIPLY);
    expect(types).toContain(TokenType.RETURN);
    expect(types).toContain(TokenType.EOF);
  });

  test("should tokenize void keyword", () => {
    const lexer = new Lexer("void");
    const tokens = lexer.scanTokens();

    expect(tokens.length).toBe(2); // void + EOF
    expect(tokens[0].type).toBe(TokenType.VOID);
    expect(tokens[0].lexeme).toBe("void");
  });

  test("should tokenize void function signature", () => {
    const lexer = new Lexer("void test()");
    const tokens = lexer.scanTokens();

    expect(tokens[0].type).toBe(TokenType.VOID);
    expect(tokens[1].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[1].lexeme).toBe("test");
  });
});
