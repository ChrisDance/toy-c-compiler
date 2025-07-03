import { Lexer, TokenType } from "../src/Lexer";

describe("Lexer", () => {
  test("should tokenize empty input", () => {
    const lexer = new Lexer().load("");
    const tokens = lexer.run();
    expect(tokens[0].type).toBe(TokenType.EOF);
  });

  test("should tokenize basic tokens", () => {
    const lexer = new Lexer().load("{}();+-*/=<>==");
    const tokens = lexer.run();

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
    const lexer = new Lexer().load("int return if else while void");
    const tokens = lexer.run();

    expect(tokens.length).toBe(7); // 6 keywords + EOF
    expect(tokens[0].type).toBe(TokenType.INT);
    expect(tokens[1].type).toBe(TokenType.RETURN);
    expect(tokens[2].type).toBe(TokenType.IF);
    expect(tokens[3].type).toBe(TokenType.ELSE);
    expect(tokens[4].type).toBe(TokenType.WHILE);
    expect(tokens[5].type).toBe(TokenType.VOID);
  });

  test("should tokenize identifiers", () => {
    const lexer = new Lexer().load("foo bar baz");
    const tokens = lexer.run();

    expect(tokens.length).toBe(4); // 3 identifiers + EOF
    expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[0].lexeme).toBe("foo");
    expect(tokens[1].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[1].lexeme).toBe("bar");
    expect(tokens[2].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[2].lexeme).toBe("baz");
  });

  test("should tokenize numbers", () => {
    const lexer = new Lexer().load("123 456 789");
    const tokens = lexer.run();

    expect(tokens.length).toBe(4); // 3 numbers + EOF
    expect(tokens[0].type).toBe(TokenType.NUMBER);
    expect(tokens[0].literal).toBe(123);
    expect(tokens[1].type).toBe(TokenType.NUMBER);
    expect(tokens[1].literal).toBe(456);
    expect(tokens[2].type).toBe(TokenType.NUMBER);
    expect(tokens[2].literal).toBe(789);
  });

  test("should handle whitespace correctly", () => {
    const lexer = new Lexer().load("  int  \n  main  \t  (  )  ");
    const tokens = lexer.run();

    expect(tokens.length).toBe(5); // int, main, (, ), EOF
    expect(tokens[0].type).toBe(TokenType.INT);
    expect(tokens[1].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[1].lexeme).toBe("main");
    expect(tokens[2].type).toBe(TokenType.LEFT_PAREN);
    expect(tokens[3].type).toBe(TokenType.RIGHT_PAREN);
  });

  test("should track line numbers", () => {
    const lexer = new Lexer().load("int\nmain\n(\n)\n{");
    const tokens = lexer.run();

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

    const lexer = new Lexer().load(input);
    const tokens = lexer.run();

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
    const lexer = new Lexer().load("void");
    const tokens = lexer.run();

    expect(tokens.length).toBe(2); // void + EOF
    expect(tokens[0].type).toBe(TokenType.VOID);
    expect(tokens[0].lexeme).toBe("void");
  });

  test("should tokenize void function signature", () => {
    const lexer = new Lexer().load("void test()");
    const tokens = lexer.run();

    expect(tokens[0].type).toBe(TokenType.VOID);
    expect(tokens[1].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[1].lexeme).toBe("test");
  });

  // NEW POINTER-RELATED TESTS

  test("should tokenize ampersand operator", () => {
    const lexer = new Lexer().load("&variable");
    const tokens = lexer.run();

    expect(tokens.length).toBe(3); // &, variable, EOF
    expect(tokens[0].type).toBe(TokenType.AMPERSAND);
    expect(tokens[0].lexeme).toBe("&");
    expect(tokens[1].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[1].lexeme).toBe("variable");
  });

  test("should tokenize pointer declaration", () => {
    const lexer = new Lexer().load("int* ptr");
    const tokens = lexer.run();

    expect(tokens.length).toBe(4); // int, *, ptr, EOF
    expect(tokens[0].type).toBe(TokenType.INT);
    expect(tokens[1].type).toBe(TokenType.MULTIPLY);
    expect(tokens[1].lexeme).toBe("*");
    expect(tokens[2].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[2].lexeme).toBe("ptr");
  });

  test("should tokenize pointer dereference", () => {
    const lexer = new Lexer().load("*ptr = 5");
    const tokens = lexer.run();

    expect(tokens.length).toBe(5); // *, ptr, =, 5, EOF
    expect(tokens[0].type).toBe(TokenType.MULTIPLY);
    expect(tokens[0].lexeme).toBe("*");
    expect(tokens[1].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[1].lexeme).toBe("ptr");
    expect(tokens[2].type).toBe(TokenType.EQUAL);
    expect(tokens[3].type).toBe(TokenType.NUMBER);
    expect(tokens[3].literal).toBe(5);
  });

  test("should tokenize address-of assignment", () => {
    const lexer = new Lexer().load("ptr = &variable");
    const tokens = lexer.run();

    expect(tokens.length).toBe(5); // ptr, =, &, variable, EOF
    expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[0].lexeme).toBe("ptr");
    expect(tokens[1].type).toBe(TokenType.EQUAL);
    expect(tokens[2].type).toBe(TokenType.AMPERSAND);
    expect(tokens[2].lexeme).toBe("&");
    expect(tokens[3].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[3].lexeme).toBe("variable");
  });

  test("should tokenize complex pointer operations", () => {
    const lexer = new Lexer().load("*ptr1 = &(*ptr2 + 3)");
    const tokens = lexer.run();

    expect(tokens.length).toBe(11); // *, ptr1, =, &, (, *, ptr2, +, 3, ), EOF

    const expectedTypes = [
      TokenType.MULTIPLY, // *
      TokenType.IDENTIFIER, // ptr1
      TokenType.EQUAL, // =
      TokenType.AMPERSAND, // &
      TokenType.LEFT_PAREN, // (
      TokenType.MULTIPLY, // *
      TokenType.IDENTIFIER, // ptr2
      TokenType.PLUS, // +
      TokenType.NUMBER, // 3
      TokenType.RIGHT_PAREN, // )
      TokenType.SEMICOLON, // ; (not in input, so EOF)
      TokenType.EOF,
    ];

    // Remove semicolon expectation since it's not in the input
    const actualTypes = tokens.map((t) => t.type);
    expect(actualTypes).toEqual([
      TokenType.MULTIPLY,
      TokenType.IDENTIFIER,
      TokenType.EQUAL,
      TokenType.AMPERSAND,
      TokenType.LEFT_PAREN,
      TokenType.MULTIPLY,
      TokenType.IDENTIFIER,
      TokenType.PLUS,
      TokenType.NUMBER,
      TokenType.RIGHT_PAREN,
      TokenType.EOF,
    ]);
  });

  test("should tokenize pointer function signature", () => {
    const lexer = new Lexer().load("int* getPointer(int* param)");
    const tokens = lexer.run();

    expect(tokens.length).toBe(9); // int, *, getPointer, (, int, *, param, ), EOF
    expect(tokens[0].type).toBe(TokenType.INT);
    expect(tokens[1].type).toBe(TokenType.MULTIPLY);
    expect(tokens[2].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[2].lexeme).toBe("getPointer");
    expect(tokens[3].type).toBe(TokenType.LEFT_PAREN);
    expect(tokens[4].type).toBe(TokenType.INT);
    expect(tokens[5].type).toBe(TokenType.MULTIPLY);
    expect(tokens[6].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[6].lexeme).toBe("param");
    expect(tokens[7].type).toBe(TokenType.RIGHT_PAREN);
  });

  test("should tokenize pointer arithmetic", () => {
    const lexer = new Lexer().load("ptr + 1");
    const tokens = lexer.run();

    expect(tokens.length).toBe(4); // ptr, +, 1, EOF
    expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[0].lexeme).toBe("ptr");
    expect(tokens[1].type).toBe(TokenType.PLUS);
    expect(tokens[2].type).toBe(TokenType.NUMBER);
    expect(tokens[2].literal).toBe(1);
  });

  test("should tokenize multiple pointer levels", () => {
    const lexer = new Lexer().load("**ptr");
    const tokens = lexer.run();

    expect(tokens.length).toBe(4); // *, *, ptr, EOF
    expect(tokens[0].type).toBe(TokenType.MULTIPLY);
    expect(tokens[1].type).toBe(TokenType.MULTIPLY);
    expect(tokens[2].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[2].lexeme).toBe("ptr");
  });

  test("should tokenize pointer comparison", () => {
    const lexer = new Lexer().load("ptr1 == ptr2");
    const tokens = lexer.run();

    expect(tokens.length).toBe(4); // ptr1, ==, ptr2, EOF
    expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[0].lexeme).toBe("ptr1");
    expect(tokens[1].type).toBe(TokenType.EQUAL_EQUAL);
    expect(tokens[2].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[2].lexeme).toBe("ptr2");
  });

  test("check comments", () => {
    const lexer = new Lexer().load(`

      int main() {
        // comment;
        return 0; // nah
      }


      `);
    const tokens = lexer.run();
    console.log(tokens);
    expect(tokens.length).toBe(10);
  });

  test("should tokenize complete pointer function", () => {
    const input = `
      int* allocateInt() {
        int* ptr = &value;
        *ptr = 42;
        return ptr;
      }
    `;

    const lexer = new Lexer().load(input);
    const tokens = lexer.run();

    const types = tokens.map((t) => t.type);

    // Check that all expected tokens are present
    expect(types).toContain(TokenType.INT);
    expect(types).toContain(TokenType.MULTIPLY);
    expect(types).toContain(TokenType.AMPERSAND);
    expect(types).toContain(TokenType.IDENTIFIER);
    expect(types).toContain(TokenType.EQUAL);
    expect(types).toContain(TokenType.NUMBER);
    expect(types).toContain(TokenType.RETURN);
    expect(types).toContain(TokenType.LEFT_BRACE);
    expect(types).toContain(TokenType.RIGHT_BRACE);
    expect(types).toContain(TokenType.SEMICOLON);
    expect(types).toContain(TokenType.EOF);

    // Count specific pointer-related tokens
    const multiplyCount = types.filter((t) => t === TokenType.MULTIPLY).length;
    const ampersandCount = types.filter(
      (t) => t === TokenType.AMPERSAND,
    ).length;

    expect(multiplyCount).toBe(3);
    expect(ampersandCount).toBe(1);
  });
});
