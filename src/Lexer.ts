export enum TokenType {
  INT = "INT",
  VOID = "VOID",
  RETURN = "RETURN",
  IF = "IF",
  ELSE = "ELSE",
  WHILE = "WHILE",

  IDENTIFIER = "IDENTIFIER",
  NUMBER = "NUMBER",

  MULTIPLY = "MULTIPLY",
  PLUS = "PLUS",
  DIVIDE = "DIVIDE",
  MINUS = "MINUS",
  EQUAL = "EQUAL",
  LESS_THAN = "LESS_THAN",
  GREATER_THAN = "GREATER_THAN",
  EQUAL_EQUAL = "EQUAL_EQUAL",
  AMPERSAND = "AMPERSAND",

  LEFT_PAREN = "LEFT_PAREN",
  RIGHT_PAREN = "RIGHT_PAREN",
  LEFT_BRACE = "LEFT_BRACE",
  RIGHT_BRACE = "RIGHT_BRACE",
  SEMICOLON = "SEMICOLON",
  COMMA = "COMMA",

  EOF = "EOF",
}

export interface Token {
  type: TokenType;
  lexeme: string;
  literal?: any;
  line: number;
}

export class Lexer {
  private source!: string;
  private tokens: Token[] = [];

  private start = 0;
  private current = 0;
  private line = 1;

  load(source: string): Lexer {
    this.source = source;
    this.tokens = [];
    this.start = 0;
    this.current = 0;
    this.line = 1;
    return this;
  }

  run(): Token[] {
    while (!this.isAtEnd()) {
      this.start = this.current;
      this.scanToken();
    }

    this.tokens.push({
      type: TokenType.EOF,
      lexeme: "",
      line: this.line,
    });

    return this.tokens;
  }

  private scanToken(): void {
    const c = this.advance();

    switch (c) {
      case "(":
        this.addToken(TokenType.LEFT_PAREN);
        break;
      case ")":
        this.addToken(TokenType.RIGHT_PAREN);
        break;
      case ",":
        this.addToken(TokenType.COMMA);
        break;
      case "{":
        this.addToken(TokenType.LEFT_BRACE);
        break;
      case "}":
        this.addToken(TokenType.RIGHT_BRACE);
        break;
      case ";":
        this.addToken(TokenType.SEMICOLON);
        break;
      case "*":
        this.addToken(TokenType.MULTIPLY);
        break;
      case "+":
        this.addToken(TokenType.PLUS);
        break;
      case "-":
        this.addToken(TokenType.MINUS);
        break;
      case "/":
        if (this.peek() === "/") {
          while (this.advance() != "\n") {}
        } else {
          this.addToken(TokenType.DIVIDE);
        }
        break;
      case "<":
        this.addToken(TokenType.LESS_THAN);
        break;
      case ">":
        this.addToken(TokenType.GREATER_THAN);
        break;
      case "&":
        this.addToken(TokenType.AMPERSAND);
        break;
      case "=":
        if (this.match("=")) {
          this.addToken(TokenType.EQUAL_EQUAL);
        } else {
          this.addToken(TokenType.EQUAL);
        }
        break;

      case " ":
      case "\r":
      case "\t":
        break;

      case "\n":
        this.line++;
        break;

      default:
        if (this.isDigit(c)) {
          this.number();
        } else if (this.isAlpha(c)) {
          this.identifier();
        } else if (c !== "\0") {
          console.error(
            `Unexpected character: '${c}' (code ${c.charCodeAt(0)}) at line ${
              this.line
            }`,
          );
        }
        break;
    }
  }

  private identifier(): void {
    while (this.isAlphaNumeric(this.peek())) this.advance();

    const text = this.source.substring(this.start, this.current);

    let type = TokenType.IDENTIFIER;
    if (text === "int") {
      type = TokenType.INT;
    } else if (text == "void") {
      type = TokenType.VOID;
    } else if (text === "return") {
      type = TokenType.RETURN;
    } else if (text === "if") {
      type = TokenType.IF;
    } else if (text === "else") {
      type = TokenType.ELSE;
    } else if (text === "while") {
      type = TokenType.WHILE;
    }

    this.addToken(type);
  }

  private number(): void {
    while (this.isDigit(this.peek())) this.advance();

    if (this.peek() === "." && this.isDigit(this.peekNext())) {
      this.advance();
      while (this.isDigit(this.peek())) this.advance();
    }

    this.addToken(
      TokenType.NUMBER,
      parseInt(this.source.substring(this.start, this.current)),
    );
  }

  private match(expected: string): boolean {
    if (this.isAtEnd()) return false;
    if (this.source.charAt(this.current) !== expected) return false;

    this.current++;
    return true;
  }

  private peek(): string {
    if (this.isAtEnd()) return "\0";
    return this.source.charAt(this.current);
  }

  private peekNext(): string {
    if (this.current + 1 >= this.source.length) return "\0";
    return this.source.charAt(this.current + 1);
  }

  private isAlpha(c: string): boolean {
    return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_";
  }

  private isAlphaNumeric(c: string): boolean {
    return this.isAlpha(c) || this.isDigit(c);
  }

  private isDigit(c: string): boolean {
    return c >= "0" && c <= "9";
  }

  private isAtEnd(): boolean {
    return this.current >= this.source.length;
  }

  private advance(): string {
    return this.source.charAt(this.current++);
  }

  private addToken(type: TokenType, literal?: any): void {
    const text = this.source.substring(this.start, this.current);
    this.tokens.push({
      type,
      lexeme: text,
      literal,
      line: this.line,
    });
  }
}
