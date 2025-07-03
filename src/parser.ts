import { Token, TokenType } from "./Lexer";

export enum NodeType {
  Program = "Program",
  FunctionDeclaration = "FunctionDeclaration",
  Parameter = "Parameter",
  BlockStatement = "BlockStatement",
  ReturnStatement = "ReturnStatement",
  VariableDeclaration = "VariableDeclaration",
  IfStatement = "IfStatement",
  AssignmentStatement = "AssignmentStatement",
  ExpressionStatement = "ExpressionStatement",
  WhileStatement = "WhileStatement",
  FunctionCall = "FunctionCall",
  BinaryExpression = "BinaryExpression",
  UnaryExpression = "UnaryExpression",
  Identifier = "Identifier",
  NumberLiteral = "NumberLiteral",
  /*null-object pattern */
  VoidExpression = "VoidExpression",
}

export interface Node {
  type: NodeType;
}

export interface AssignmentStatement extends Node {
  type: NodeType.AssignmentStatement;
  target: string | UnaryExpression;
  value: Expression;
}

export interface Program extends Node {
  type: NodeType.Program;
  functions: FunctionDeclaration[];
}

export interface FunctionDeclaration extends Node {
  type: NodeType.FunctionDeclaration;
  name: string;
  params: Parameter[];
  returnType: string;
  body: BlockStatement;
}

export interface Parameter extends Node {
  type: NodeType.Parameter;
  name: string;
  paramType: string;
}

export interface WhileStatement extends Node {
  type: NodeType.WhileStatement;
  condition: Expression;
  body: Statement;
}

export interface BlockStatement extends Node {
  type: NodeType.BlockStatement;
  statements: Statement[];
}

export type Statement =
  | ReturnStatement
  | VariableDeclaration
  | ExpressionStatement
  | IfStatement
  | AssignmentStatement
  | WhileStatement
  | BlockStatement;

export interface ReturnStatement extends Node {
  type: NodeType.ReturnStatement;
  argument: Expression;
}

export interface VariableDeclaration extends Node {
  type: NodeType.VariableDeclaration;
  name: string;
  varType: string;
  init: Expression;
}

export interface ExpressionStatement extends Node {
  type: NodeType.ExpressionStatement;
  expression: Expression;
}

export interface IfStatement extends Node {
  type: NodeType.IfStatement;
  condition: Expression;
  thenBranch: Statement;
  elseBranch: Statement | null;
}

export type Expression =
  | BinaryExpression
  | UnaryExpression
  | VoidExpression
  | FunctionCall
  | Identifier
  | NumberLiteral;

export interface BinaryExpression extends Node {
  type: NodeType.BinaryExpression;
  operator: string;
  left: Expression;
  right: Expression;
}

export interface UnaryExpression extends Node {
  type: NodeType.UnaryExpression;
  operator: string;
  operand: Expression;
}

export interface VoidExpression extends Node {
  type: NodeType.VoidExpression;
}

export interface FunctionCall extends Node {
  type: NodeType.FunctionCall;
  callee: string;
  arguments: Expression[];
}

export interface Identifier extends Node {
  type: NodeType.Identifier;
  name: string;
}

export interface NumberLiteral extends Node {
  type: NodeType.NumberLiteral;
  value: number;
}

export class Parser {
  private tokens!: Token[];
  private current: number = 0;

  load(tokens: Token[]): Parser {
    this.tokens = tokens;
    this.current = 0;
    return this;
  }

  run(): Program {
    if (!this.tokens) {
      throw new Error("No tokens loaded");
    }

    if (this.tokens.length <= 1) {
      throw new Error("Cannot parse empty program");
    }

    const functions: FunctionDeclaration[] = [];

    while (!this.isAtEnd()) {
      /*to support:
      int i;
      int main() {return i;}

      we'd need to alter this beyond just parsing functions at the top level.
      */
      const func = this.parseFunction();
      this.validateFunction(func);
      functions.push(func);
    }

    return {
      type: NodeType.Program,
      functions,
    };
  }

  private parseWhileStatement(): WhileStatement {
    this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'while'.");
    const condition = this.parseExpression();
    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after while condition.");

    const body = this.parseStatement();

    return {
      type: NodeType.WhileStatement,
      condition,
      body,
    };
  }

  private parseFunction(): FunctionDeclaration {
    /*  parse return type (int, int*, or void) */
    let returnType: string;
    if (this.match(TokenType.INT)) {
      returnType = "int";
      /*check for pointer type*/
      if (this.match(TokenType.MULTIPLY)) {
        returnType = "int*";
      }
    } else if (this.match(TokenType.VOID)) {
      returnType = "void";
    } else {
      throw this.error(this.peek(), "Expect return type (int, int*, or void).");
    }

    const nameToken = this.consume(
      TokenType.IDENTIFIER,
      "Expect function name.",
    );

    this.consume(TokenType.LEFT_PAREN, "Expect '(' after function name.");

    const params: Parameter[] = [];
    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        this.consume(TokenType.INT, "Expect parameter type.");

        let paramType = "int";
        /*  check for pointer parameter */
        if (this.match(TokenType.MULTIPLY)) {
          paramType = "int*";
        }

        const paramName = this.consume(
          TokenType.IDENTIFIER,
          "Expect parameter name.",
        );

        params.push({
          type: NodeType.Parameter,
          name: paramName.lexeme,
          paramType,
        });
      } while (this.match(TokenType.COMMA));
    }

    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after parameters.");
    this.consume(TokenType.LEFT_BRACE, "Expect '{' before function body.");
    const body = this.parseBlock();

    return {
      type: NodeType.FunctionDeclaration,
      name: nameToken.lexeme,
      params,
      returnType,
      body,
    };
  }

  private parseBlock(): BlockStatement {
    const statements: Statement[] = [];
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      statements.push(this.parseStatement());
    }

    this.consume(TokenType.RIGHT_BRACE, "Expect '}' after block.");

    return {
      type: NodeType.BlockStatement,
      statements,
    };
  }

  private parseStatement(): Statement {
    if (this.match(TokenType.RETURN)) {
      return this.parseReturnStatement();
    }

    if (this.match(TokenType.IF)) {
      return this.parseIfStatement();
    }

    if (this.match(TokenType.WHILE)) {
      return this.parseWhileStatement();
    }

    if (this.check(TokenType.INT)) {
      this.advance();
      return this.parseVariableDeclaration();
    }

    if (this.match(TokenType.LEFT_BRACE)) {
      return this.parseBlock();
    }

    if (this.check(TokenType.IDENTIFIER) || this.check(TokenType.MULTIPLY)) {
      const checkpoint = this.current;

      try {
        let target: string | UnaryExpression;

        if (this.match(TokenType.MULTIPLY)) {
          /*dereference assignment: *ptr = value*/
          const operand = this.parsePrimary();
          target = {
            type: NodeType.UnaryExpression,
            operator: "*",
            operand,
          };
        } else {
          /*regular variable assignment*/
          const identifier = this.advance();
          target = identifier.lexeme;
        }

        if (this.match(TokenType.EQUAL)) {
          const value = this.parseExpression();
          this.consume(TokenType.SEMICOLON, "Expect ';' after assignment.");

          return {
            type: NodeType.AssignmentStatement,
            target,
            value,
          };
        } else {
          /* not an assignment, backtrack and parse as expression*/
          this.current = checkpoint;
          return this.parseExpressionStatement();
        }
      } catch (error) {
        /*if parsing as assignment fails, backtrack and try as expression*/
        this.current = checkpoint;
        return this.parseExpressionStatement();
      }
    }

    return this.parseExpressionStatement();
  }

  private parseIfStatement(): IfStatement {
    this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'if'.");
    const condition = this.parseExpression();
    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after if condition.");

    const thenBranch = this.parseStatement();

    let elseBranch = null;
    if (this.match(TokenType.ELSE)) {
      elseBranch = this.parseStatement();
    }

    return {
      type: NodeType.IfStatement,
      condition,
      thenBranch,
      elseBranch,
    };
  }

  private parseReturnStatement(): ReturnStatement {
    let expression: Expression | null = null;

    /* check if there's an expression after return*/
    if (!this.check(TokenType.SEMICOLON)) {
      expression = this.parseExpression();
    } else {
      expression = { type: NodeType.VoidExpression } as VoidExpression;
    }

    this.consume(TokenType.SEMICOLON, "Expect ';' after return statement.");

    return {
      type: NodeType.ReturnStatement,
      argument: expression,
    };
  }

  private parseVariableDeclaration(): VariableDeclaration {
    /* INT token was already consumed in parseStatement */
    let varType = "int";

    if (this.match(TokenType.MULTIPLY)) {
      varType = "int*";
    }

    const name = this.consume(
      TokenType.IDENTIFIER,
      "Expect variable name.",
    ).lexeme;

    this.consume(TokenType.EQUAL, "Expect '=' after variable name.");

    const initializer = this.parseExpression();

    this.consume(TokenType.SEMICOLON, "Expect ';' after variable declaration.");

    return {
      type: NodeType.VariableDeclaration,
      name,
      varType,
      init: initializer,
    };
  }

  private parseExpressionStatement(): ExpressionStatement {
    const expr = this.parseExpression();
    this.consume(TokenType.SEMICOLON, "Expect ';' after expression.");

    return {
      type: NodeType.ExpressionStatement,
      expression: expr,
    };
  }

  private parseExpression(): Expression {
    return this.parseComparison();
  }

  private parseComparison(): Expression {
    let expr = this.parseAdditive();

    if (
      this.match(
        TokenType.LESS_THAN,
        TokenType.GREATER_THAN,
        TokenType.EQUAL_EQUAL,
      )
    ) {
      const operator = this.previous().lexeme;
      const right = this.parseAdditive();
      expr = {
        type: NodeType.BinaryExpression,
        operator,
        left: expr,
        right,
      };
    }

    return expr;
  }

  private parseAdditive(): Expression {
    let expr = this.parseTerm();

    while (this.match(TokenType.PLUS, TokenType.MINUS)) {
      const operator = this.previous().lexeme;
      const right = this.parseTerm();
      expr = {
        type: NodeType.BinaryExpression,
        operator,
        left: expr,
        right,
      };
    }

    return expr;
  }

  private parseTerm(): Expression {
    let expr = this.parseUnary();

    while (this.match(TokenType.MULTIPLY, TokenType.DIVIDE)) {
      const operator = this.previous().lexeme;
      const right = this.parseUnary();
      expr = {
        type: NodeType.BinaryExpression,
        operator,
        left: expr,
        right,
      };
    }

    return expr;
  }

  private parseUnary(): Expression {
    if (this.match(TokenType.AMPERSAND)) {
      /*  address-of operator: &variable*/
      const operator = this.previous().lexeme;
      const operand = this.parseUnary();
      return {
        type: NodeType.UnaryExpression,
        operator,
        operand,
      };
    }

    if (this.match(TokenType.MULTIPLY)) {
      /* dereference operator: *pointer*/
      const operator = this.previous().lexeme;
      const operand = this.parseUnary();
      return {
        type: NodeType.UnaryExpression,
        operator,
        operand,
      };
    }

    return this.parsePrimary();
  }

  private parsePrimary(): Expression {
    if (this.match(TokenType.NUMBER)) {
      return {
        type: NodeType.NumberLiteral,
        value: Number(this.previous().lexeme),
      };
    }

    if (this.match(TokenType.IDENTIFIER)) {
      const name = this.previous().lexeme;

      /* is function? */
      if (this.match(TokenType.LEFT_PAREN)) {
        const args: Expression[] = [];

        if (!this.check(TokenType.RIGHT_PAREN)) {
          /** multiple args */
          do {
            args.push(this.parseExpression());
          } while (this.match(TokenType.COMMA));
        }

        this.consume(TokenType.RIGHT_PAREN, "Expect ')' after arguments.");

        return {
          type: NodeType.FunctionCall,
          callee: name,
          arguments: args,
        };
      }

      /** nope, just variable */
      return {
        type: NodeType.Identifier,
        name,
      };
    }

    if (this.match(TokenType.LEFT_PAREN)) {
      const expr = this.parseExpression();
      this.consume(TokenType.RIGHT_PAREN, "Expect ')' after expression.");
      return expr;
    }

    throw this.error(this.peek(), "Expect expression.");
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw this.error(this.peek(), message);
  }

  private error(token: Token, message: string): Error {
    const errorMsg =
      token.type === TokenType.EOF
        ? `Error at end: ${message}`
        : `Error at token '${token.lexeme}' on line ${token.line}: ${message}`;
    return new Error(errorMsg);
  }

  private validateFunction(func: FunctionDeclaration): void {
    if (func.returnType === "void") {
      /*check that all return statements in void functions have no value*/
      this.validateVoidReturns(func.body);
    } else {
      /*or that non-void functions have a value*/
      this.validateNonVoidReturns(func.body);
    }
  }

  private validateVoidReturns(stmt: Statement): void {
    if (stmt.type === NodeType.ReturnStatement) {
      const returnStmt = stmt as ReturnStatement;

      if (returnStmt.argument.type != NodeType.VoidExpression) {
        throw new Error("Void function cannot return a value");
      }
    } else if (stmt.type === NodeType.BlockStatement) {
      const block = stmt as BlockStatement;
      for (const s of block.statements) {
        this.validateVoidReturns(s);
      }
    } else if (stmt.type === NodeType.IfStatement) {
      const ifStmt = stmt as IfStatement;
      this.validateVoidReturns(ifStmt.thenBranch);
      if (ifStmt.elseBranch) {
        this.validateVoidReturns(ifStmt.elseBranch);
      }
    } else if (stmt.type === NodeType.WhileStatement) {
      const whileStmt = stmt as WhileStatement;
      this.validateVoidReturns(whileStmt.body);
    }
  }

  private validateNonVoidReturns(stmt: Statement): void {
    if (stmt.type === NodeType.ReturnStatement) {
      const returnStmt = stmt as ReturnStatement;
      if (returnStmt.argument.type === NodeType.VoidExpression) {
        throw new Error("Non-void function must return a value");
      }
    } else if (stmt.type === NodeType.BlockStatement) {
      const block = stmt as BlockStatement;
      for (const s of block.statements) {
        this.validateNonVoidReturns(s);
      }
    } else if (stmt.type === NodeType.IfStatement) {
      const ifStmt = stmt as IfStatement;
      this.validateNonVoidReturns(ifStmt.thenBranch);
      if (ifStmt.elseBranch) {
        this.validateNonVoidReturns(ifStmt.elseBranch);
      }
    } else if (stmt.type === NodeType.WhileStatement) {
      const whileStmt = stmt as WhileStatement;
      this.validateNonVoidReturns(whileStmt.body);
    }
  }
}
