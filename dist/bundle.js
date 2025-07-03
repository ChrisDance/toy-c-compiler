"use strict";
var Compiler = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if ((from && typeof from === "object") || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, {
            get: () => from[key],
            enumerable:
              !(desc = __getOwnPropDesc(from, key)) || desc.enumerable,
          });
    }
    return to;
  };
  var __toCommonJS = (mod) =>
    __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    Compiler: () => Compiler,
  });

  // src/Lexer.ts
  var Lexer = class {
    source;
    tokens = [];
    start = 0;
    current = 0;
    line = 1;
    load(source) {
      this.source = source;
      this.tokens = [];
      this.start = 0;
      this.current = 0;
      this.line = 1;
      return this;
    }
    run() {
      while (!this.isAtEnd()) {
        this.start = this.current;
        this.scanToken();
      }
      this.tokens.push({
        type: "EOF" /* EOF */,
        lexeme: "",
        line: this.line,
      });
      return this.tokens;
    }
    scanToken() {
      const c = this.advance();
      switch (c) {
        case "(":
          this.addToken("LEFT_PAREN" /* LEFT_PAREN */);
          break;
        case ")":
          this.addToken("RIGHT_PAREN" /* RIGHT_PAREN */);
          break;
        case ",":
          this.addToken("COMMA" /* COMMA */);
          break;
        case "{":
          this.addToken("LEFT_BRACE" /* LEFT_BRACE */);
          break;
        case "}":
          this.addToken("RIGHT_BRACE" /* RIGHT_BRACE */);
          break;
        case ";":
          this.addToken("SEMICOLON" /* SEMICOLON */);
          break;
        case "*":
          this.addToken("MULTIPLY" /* MULTIPLY */);
          break;
        case "+":
          this.addToken("PLUS" /* PLUS */);
          break;
        case "-":
          this.addToken("MINUS" /* MINUS */);
          break;
        case "/":
          if (this.peek() === "/") {
            while (this.advance() != "\n") {}
          } else {
            this.addToken("DIVIDE" /* DIVIDE */);
          }
          break;
        case "<":
          this.addToken("LESS_THAN" /* LESS_THAN */);
          break;
        case ">":
          this.addToken("GREATER_THAN" /* GREATER_THAN */);
          break;
        case "&":
          this.addToken("AMPERSAND" /* AMPERSAND */);
          break;
        case "=":
          if (this.match("=")) {
            this.addToken("EQUAL_EQUAL" /* EQUAL_EQUAL */);
          } else {
            this.addToken("EQUAL" /* EQUAL */);
          }
          break;
        case " ":
        case "\r":
        case "	":
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
              `Unexpected character: '${c}' (code ${c.charCodeAt(0)}) at line ${this.line}`,
            );
          }
          break;
      }
    }
    identifier() {
      while (this.isAlphaNumeric(this.peek())) this.advance();
      const text = this.source.substring(this.start, this.current);
      let type = "IDENTIFIER"; /* IDENTIFIER */
      if (text === "int") {
        type = "INT" /* INT */;
      } else if (text == "void") {
        type = "VOID" /* VOID */;
      } else if (text === "return") {
        type = "RETURN" /* RETURN */;
      } else if (text === "if") {
        type = "IF" /* IF */;
      } else if (text === "else") {
        type = "ELSE" /* ELSE */;
      } else if (text === "while") {
        type = "WHILE" /* WHILE */;
      }
      this.addToken(type);
    }
    number() {
      while (this.isDigit(this.peek())) this.advance();
      if (this.peek() === "." && this.isDigit(this.peekNext())) {
        this.advance();
        while (this.isDigit(this.peek())) this.advance();
      }
      this.addToken(
        "NUMBER" /* NUMBER */,
        parseInt(this.source.substring(this.start, this.current)),
      );
    }
    match(expected) {
      if (this.isAtEnd()) return false;
      if (this.source.charAt(this.current) !== expected) return false;
      this.current++;
      return true;
    }
    peek() {
      if (this.isAtEnd()) return "\0";
      return this.source.charAt(this.current);
    }
    peekNext() {
      if (this.current + 1 >= this.source.length) return "\0";
      return this.source.charAt(this.current + 1);
    }
    isAlpha(c) {
      return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_";
    }
    isAlphaNumeric(c) {
      return this.isAlpha(c) || this.isDigit(c);
    }
    isDigit(c) {
      return c >= "0" && c <= "9";
    }
    isAtEnd() {
      return this.current >= this.source.length;
    }
    advance() {
      return this.source.charAt(this.current++);
    }
    addToken(type, literal) {
      const text = this.source.substring(this.start, this.current);
      this.tokens.push({
        type,
        lexeme: text,
        literal,
        line: this.line,
      });
    }
  };

  // src/parser.ts
  var Parser = class {
    tokens;
    current = 0;
    load(tokens) {
      this.tokens = tokens;
      this.current = 0;
      return this;
    }
    run() {
      if (!this.tokens) {
        throw new Error("No tokens loaded");
      }
      if (this.tokens.length <= 1) {
        throw new Error("Cannot parse empty program");
      }
      const functions = [];
      while (!this.isAtEnd()) {
        const func = this.parseFunction();
        this.validateFunction(func);
        functions.push(func);
      }
      return {
        type: "Program" /* Program */,
        functions,
      };
    }
    parseWhileStatement() {
      this.consume("LEFT_PAREN" /* LEFT_PAREN */, "Expect '(' after 'while'.");
      const condition = this.parseExpression();
      this.consume(
        "RIGHT_PAREN" /* RIGHT_PAREN */,
        "Expect ')' after while condition.",
      );
      const body = this.parseStatement();
      return {
        type: "WhileStatement" /* WhileStatement */,
        condition,
        body,
      };
    }
    parseFunction() {
      let returnType;
      if (this.match("INT" /* INT */)) {
        returnType = "int";
        if (this.match("MULTIPLY" /* MULTIPLY */)) {
          returnType = "int*";
        }
      } else if (this.match("VOID" /* VOID */)) {
        returnType = "void";
      } else {
        throw this.error(
          this.peek(),
          "Expect return type (int, int*, or void).",
        );
      }
      const nameToken = this.consume(
        "IDENTIFIER" /* IDENTIFIER */,
        "Expect function name.",
      );
      this.consume(
        "LEFT_PAREN" /* LEFT_PAREN */,
        "Expect '(' after function name.",
      );
      const params = [];
      if (!this.check("RIGHT_PAREN" /* RIGHT_PAREN */)) {
        do {
          this.consume("INT" /* INT */, "Expect parameter type.");
          let paramType = "int";
          if (this.match("MULTIPLY" /* MULTIPLY */)) {
            paramType = "int*";
          }
          const paramName = this.consume(
            "IDENTIFIER" /* IDENTIFIER */,
            "Expect parameter name.",
          );
          params.push({
            type: "Parameter" /* Parameter */,
            name: paramName.lexeme,
            paramType,
          });
        } while (this.match("COMMA" /* COMMA */));
      }
      this.consume(
        "RIGHT_PAREN" /* RIGHT_PAREN */,
        "Expect ')' after parameters.",
      );
      this.consume(
        "LEFT_BRACE" /* LEFT_BRACE */,
        "Expect '{' before function body.",
      );
      const body = this.parseBlock();
      return {
        type: "FunctionDeclaration" /* FunctionDeclaration */,
        name: nameToken.lexeme,
        params,
        returnType,
        body,
      };
    }
    parseBlock() {
      const statements = [];
      while (!this.check("RIGHT_BRACE" /* RIGHT_BRACE */) && !this.isAtEnd()) {
        statements.push(this.parseStatement());
      }
      this.consume("RIGHT_BRACE" /* RIGHT_BRACE */, "Expect '}' after block.");
      return {
        type: "BlockStatement" /* BlockStatement */,
        statements,
      };
    }
    parseStatement() {
      if (this.match("RETURN" /* RETURN */)) {
        return this.parseReturnStatement();
      }
      if (this.match("IF" /* IF */)) {
        return this.parseIfStatement();
      }
      if (this.match("WHILE" /* WHILE */)) {
        return this.parseWhileStatement();
      }
      if (this.check("INT" /* INT */)) {
        this.advance();
        return this.parseVariableDeclaration();
      }
      if (this.match("LEFT_BRACE" /* LEFT_BRACE */)) {
        return this.parseBlock();
      }
      if (
        this.check("IDENTIFIER" /* IDENTIFIER */) ||
        this.check("MULTIPLY" /* MULTIPLY */)
      ) {
        const checkpoint = this.current;
        try {
          let target;
          if (this.match("MULTIPLY" /* MULTIPLY */)) {
            const operand = this.parsePrimary();
            target = {
              type: "UnaryExpression" /* UnaryExpression */,
              operator: "*",
              operand,
            };
          } else {
            const identifier = this.advance();
            target = identifier.lexeme;
          }
          if (this.match("EQUAL" /* EQUAL */)) {
            const value = this.parseExpression();
            this.consume(
              "SEMICOLON" /* SEMICOLON */,
              "Expect ';' after assignment.",
            );
            return {
              type: "AssignmentStatement" /* AssignmentStatement */,
              target,
              value,
            };
          } else {
            this.current = checkpoint;
            return this.parseExpressionStatement();
          }
        } catch (error) {
          this.current = checkpoint;
          return this.parseExpressionStatement();
        }
      }
      return this.parseExpressionStatement();
    }
    parseIfStatement() {
      this.consume("LEFT_PAREN" /* LEFT_PAREN */, "Expect '(' after 'if'.");
      const condition = this.parseExpression();
      this.consume(
        "RIGHT_PAREN" /* RIGHT_PAREN */,
        "Expect ')' after if condition.",
      );
      const thenBranch = this.parseStatement();
      let elseBranch = null;
      if (this.match("ELSE" /* ELSE */)) {
        elseBranch = this.parseStatement();
      }
      return {
        type: "IfStatement" /* IfStatement */,
        condition,
        thenBranch,
        elseBranch,
      };
    }
    parseReturnStatement() {
      let expression = null;
      if (!this.check("SEMICOLON" /* SEMICOLON */)) {
        expression = this.parseExpression();
      } else {
        expression = { type: "VoidExpression" /* VoidExpression */ };
      }
      this.consume(
        "SEMICOLON" /* SEMICOLON */,
        "Expect ';' after return statement.",
      );
      return {
        type: "ReturnStatement" /* ReturnStatement */,
        argument: expression,
      };
    }
    parseVariableDeclaration() {
      let varType = "int";
      if (this.match("MULTIPLY" /* MULTIPLY */)) {
        varType = "int*";
      }
      const name = this.consume(
        "IDENTIFIER" /* IDENTIFIER */,
        "Expect variable name.",
      ).lexeme;
      this.consume("EQUAL" /* EQUAL */, "Expect '=' after variable name.");
      const initializer = this.parseExpression();
      this.consume(
        "SEMICOLON" /* SEMICOLON */,
        "Expect ';' after variable declaration.",
      );
      return {
        type: "VariableDeclaration" /* VariableDeclaration */,
        name,
        varType,
        init: initializer,
      };
    }
    parseExpressionStatement() {
      const expr = this.parseExpression();
      this.consume("SEMICOLON" /* SEMICOLON */, "Expect ';' after expression.");
      return {
        type: "ExpressionStatement" /* ExpressionStatement */,
        expression: expr,
      };
    }
    parseExpression() {
      return this.parseComparison();
    }
    parseComparison() {
      let expr = this.parseAdditive();
      if (
        this.match(
          "LESS_THAN" /* LESS_THAN */,
          "GREATER_THAN" /* GREATER_THAN */,
          "EQUAL_EQUAL" /* EQUAL_EQUAL */,
        )
      ) {
        const operator = this.previous().lexeme;
        const right = this.parseAdditive();
        expr = {
          type: "BinaryExpression" /* BinaryExpression */,
          operator,
          left: expr,
          right,
        };
      }
      return expr;
    }
    parseAdditive() {
      let expr = this.parseTerm();
      while (this.match("PLUS" /* PLUS */, "MINUS" /* MINUS */)) {
        const operator = this.previous().lexeme;
        const right = this.parseTerm();
        expr = {
          type: "BinaryExpression" /* BinaryExpression */,
          operator,
          left: expr,
          right,
        };
      }
      return expr;
    }
    parseTerm() {
      let expr = this.parseUnary();
      while (this.match("MULTIPLY" /* MULTIPLY */, "DIVIDE" /* DIVIDE */)) {
        const operator = this.previous().lexeme;
        const right = this.parseUnary();
        expr = {
          type: "BinaryExpression" /* BinaryExpression */,
          operator,
          left: expr,
          right,
        };
      }
      return expr;
    }
    parseUnary() {
      if (this.match("AMPERSAND" /* AMPERSAND */)) {
        const operator = this.previous().lexeme;
        const operand = this.parseUnary();
        return {
          type: "UnaryExpression" /* UnaryExpression */,
          operator,
          operand,
        };
      }
      if (this.match("MULTIPLY" /* MULTIPLY */)) {
        const operator = this.previous().lexeme;
        const operand = this.parseUnary();
        return {
          type: "UnaryExpression" /* UnaryExpression */,
          operator,
          operand,
        };
      }
      return this.parsePrimary();
    }
    parsePrimary() {
      if (this.match("NUMBER" /* NUMBER */)) {
        return {
          type: "NumberLiteral" /* NumberLiteral */,
          value: Number(this.previous().lexeme),
        };
      }
      if (this.match("IDENTIFIER" /* IDENTIFIER */)) {
        const name = this.previous().lexeme;
        if (this.match("LEFT_PAREN" /* LEFT_PAREN */)) {
          const args = [];
          if (!this.check("RIGHT_PAREN" /* RIGHT_PAREN */)) {
            do {
              args.push(this.parseExpression());
            } while (this.match("COMMA" /* COMMA */));
          }
          this.consume(
            "RIGHT_PAREN" /* RIGHT_PAREN */,
            "Expect ')' after arguments.",
          );
          return {
            type: "FunctionCall" /* FunctionCall */,
            callee: name,
            arguments: args,
          };
        }
        return {
          type: "Identifier" /* Identifier */,
          name,
        };
      }
      if (this.match("LEFT_PAREN" /* LEFT_PAREN */)) {
        const expr = this.parseExpression();
        this.consume(
          "RIGHT_PAREN" /* RIGHT_PAREN */,
          "Expect ')' after expression.",
        );
        return expr;
      }
      throw this.error(this.peek(), "Expect expression.");
    }
    match(...types) {
      for (const type of types) {
        if (this.check(type)) {
          this.advance();
          return true;
        }
      }
      return false;
    }
    check(type) {
      if (this.isAtEnd()) return false;
      return this.peek().type === type;
    }
    advance() {
      if (!this.isAtEnd()) this.current++;
      return this.previous();
    }
    isAtEnd() {
      return this.peek().type === "EOF" /* EOF */;
    }
    peek() {
      return this.tokens[this.current];
    }
    previous() {
      return this.tokens[this.current - 1];
    }
    consume(type, message) {
      if (this.check(type)) return this.advance();
      throw this.error(this.peek(), message);
    }
    error(token, message) {
      const errorMsg =
        token.type === "EOF" /* EOF */
          ? `Error at end: ${message}`
          : `Error at token '${token.lexeme}' on line ${token.line}: ${message}`;
      return new Error(errorMsg);
    }
    validateFunction(func) {
      if (func.returnType === "void") {
        this.validateVoidReturns(func.body);
      } else {
        this.validateNonVoidReturns(func.body);
      }
    }
    validateVoidReturns(stmt) {
      if (stmt.type === "ReturnStatement" /* ReturnStatement */) {
        const returnStmt = stmt;
        if (returnStmt.argument.type != "VoidExpression" /* VoidExpression */) {
          throw new Error("Void function cannot return a value");
        }
      } else if (stmt.type === "BlockStatement" /* BlockStatement */) {
        const block = stmt;
        for (const s of block.statements) {
          this.validateVoidReturns(s);
        }
      } else if (stmt.type === "IfStatement" /* IfStatement */) {
        const ifStmt = stmt;
        this.validateVoidReturns(ifStmt.thenBranch);
        if (ifStmt.elseBranch) {
          this.validateVoidReturns(ifStmt.elseBranch);
        }
      } else if (stmt.type === "WhileStatement" /* WhileStatement */) {
        const whileStmt = stmt;
        this.validateVoidReturns(whileStmt.body);
      }
    }
    validateNonVoidReturns(stmt) {
      if (stmt.type === "ReturnStatement" /* ReturnStatement */) {
        const returnStmt = stmt;
        if (
          returnStmt.argument.type === "VoidExpression" /* VoidExpression */
        ) {
          throw new Error("Non-void function must return a value");
        }
      } else if (stmt.type === "BlockStatement" /* BlockStatement */) {
        const block = stmt;
        for (const s of block.statements) {
          this.validateNonVoidReturns(s);
        }
      } else if (stmt.type === "IfStatement" /* IfStatement */) {
        const ifStmt = stmt;
        this.validateNonVoidReturns(ifStmt.thenBranch);
        if (ifStmt.elseBranch) {
          this.validateNonVoidReturns(ifStmt.elseBranch);
        }
      } else if (stmt.type === "WhileStatement" /* WhileStatement */) {
        const whileStmt = stmt;
        this.validateNonVoidReturns(whileStmt.body);
      }
    }
  };

  // src/codegen.ts
  var RegisterAllocator = class {
    /* fixed pool of callee-saved registers */
    availableRegs = ["x8", "x9", "x10", "x11", "x12", "x13", "x14", "x15"];
    usedRegs = [];
    /* first-available allocation*/
    allocate() {
      if (this.availableRegs.length === 0) {
        throw new Error("No more registers available - expression too complex");
      }
      const reg = this.availableRegs.shift();
      this.usedRegs.push(reg);
      return reg;
    }
    /* simple pool-based deallocation: real allocators track live ranges and interference */
    release(reg) {
      const index = this.usedRegs.indexOf(reg);
      if (index !== -1) {
        this.usedRegs.splice(index, 1);
        this.availableRegs.unshift(reg);
      }
    }
    /* per-function reset: real compilers maintain global register state across optimization passes */
    reset() {
      this.availableRegs = [
        "x8",
        "x9",
        "x10",
        "x11",
        "x12",
        "x13",
        "x14",
        "x15",
      ];
      this.usedRegs = [];
    }
    /* fallback detection for stack-based code generation when no registers are available*/
    hasAvailable() {
      return this.availableRegs.length > 0;
    }
  };
  var ARM64CodeGenerator = class {
    ast;
    output = [];
    currentFunction = "";
    functionEndLabel = "";
    varLocationMap = /* @__PURE__ */ new Map();
    /* String literal pooling - avoids duplicate string constants in output */
    stringLiterals = /* @__PURE__ */ new Map();
    labelCounter = 0;
    stringLiteralCounter = 0;
    regAlloc = new RegisterAllocator();
    nextOffsetMap = /* @__PURE__ */ new Map();
    /* because there is no way i'm writing a linker, we're going to
      cheat and hardcode the routines, where we'd otherwise need to
      generate symbol references resolved at link time */
    specialFunctions = {
      printf: (args) => {
        const formatString = "%ld\\n";
        const label = this.addStringLiteral(formatString);
        if (args[0].type === "UnaryExpression" /* UnaryExpression */) {
          const unaryExpr = args[0];
          if (
            unaryExpr.operator === "&" &&
            unaryExpr.operand.type === "Identifier" /* Identifier */
          ) {
            const varName = unaryExpr.operand.name;
            const offset = this.getVarLocation(this.currentFunction, varName);
            if (offset) {
              return [
                `	ldr	x8, [sp, #${offset}]`,
                `	ldr	x0, [x8]`,
                /* arm64 calling convention setup for variadic functions */
                "mov x9, sp",
                "mov x8, x0",
                "str x8, [x9]",
                `adrp x0, ${label}@PAGE`,
                `add x0, x0, ${label}@PAGEOFF`,
                "bl _printf",
              ];
            }
          }
        }
        const argCode = this.generateExpression(args[0]);
        return [
          ...argCode,
          "mov x9, sp",
          "mov x8, x0",
          "str x8, [x9]",
          `adrp x0, ${label}@PAGE`,
          `add x0, x0, ${label}@PAGEOFF`,
          "bl _printf",
        ];
      },
      exit: (args) => {
        const result = [];
        if (args.length !== 1) {
          throw new Error("exit() requires exactly one argument (exit code)");
        }
        const exitCodeExpression = this.generateExpression(args[0]);
        result.push(...exitCodeExpression);
        result.push("	mov	x16, #1");
        result.push("	svc	#0x80");
        return result;
      },
    };
    load(ast) {
      this.output = [];
      this.varLocationMap.clear();
      this.stringLiterals.clear();
      this.labelCounter = 0;
      this.stringLiteralCounter = 0;
      this.nextOffsetMap.clear();
      this.ast = ast;
      return this;
    }
    run() {
      if (!this.ast) {
        throw new Error("No ast loaded in code generator");
      }
      this.addLine("	.section	__TEXT,__text,regular,pure_instructions");
      this.addLine("	.build_version macos, 15, 0	sdk_version 15, 4");
      for (const func of this.ast.functions) {
        this.generateFunction(func);
      }
      if (this.stringLiterals.size > 0) {
        this.addLine("");
        this.addLine("	.section	__TEXT,__cstring,cstring_literals");
        for (const [label, value] of this.stringLiterals.entries()) {
          this.addLine(`${label}:`);
          this.addLine(`	.asciz	"${value}"`);
        }
        this.addLine(".subsections_via_symbols");
      }
      return this.output.join("\n");
    }
    generateAssignmentStatement(stmt) {
      const valueCode = this.generateExpression(stmt.value);
      this.addLines(valueCode);
      if (typeof stmt.target === "string") {
        const offset = this.getVarLocation(this.currentFunction, stmt.target);
        if (!offset) {
          throw new Error(
            `Variable not found: ${stmt.target} in function ${this.currentFunction}`,
          );
        }
        this.addLine(`	str	x0, [sp, #${offset}]`);
      } else if (
        stmt.target.type === "UnaryExpression" /* UnaryExpression */ &&
        stmt.target.operator === "*"
      ) {
        this.addLine(`	mov	x8, x0`);
        const ptrCode = this.generateExpression(stmt.target.operand);
        this.addLines(ptrCode);
        this.addLine(`	str	x8, [x0]`);
      } else {
        throw new Error("Invalid assignment target");
      }
    }
    countLocalVariables(block) {
      let count = 0;
      for (const stmt of block.statements) {
        count += this.countVariablesInStatement(stmt);
      }
      return count;
    }
    countVariablesInStatement(stmt) {
      switch (stmt.type) {
        case "VariableDeclaration" /* VariableDeclaration */:
          return 1;
        case "BlockStatement" /* BlockStatement */:
          return this.countLocalVariables(stmt);
        case "IfStatement" /* IfStatement */:
          let ifCount = 0;
          if (stmt.thenBranch.type === "BlockStatement" /* BlockStatement */) {
            ifCount += this.countLocalVariables(stmt.thenBranch);
          } else {
            ifCount += this.countVariablesInStatement(stmt.thenBranch);
          }
          if (stmt.elseBranch) {
            if (
              stmt.elseBranch.type === "BlockStatement" /* BlockStatement */
            ) {
              ifCount += this.countLocalVariables(stmt.elseBranch);
            } else {
              ifCount += this.countVariablesInStatement(stmt.elseBranch);
            }
          }
          return ifCount;
        case "WhileStatement" /* WhileStatement */:
          if (stmt.body.type === "BlockStatement" /* BlockStatement */) {
            return this.countLocalVariables(stmt.body);
          } else {
            return this.countVariablesInStatement(stmt.body);
          }
        default:
          return 0;
      }
    }
    calculateStackSizeForFunction(func) {
      const baseStackSize = 32;
      const parameterSpace = Math.max(32, func.params.length * 8);
      const localVarCount = this.countLocalVariables(func.body);
      const localVarSpace = localVarCount * 8;
      const tempSpace = 32;
      const total = baseStackSize + parameterSpace + localVarSpace + tempSpace;
      return Math.ceil(total / 16) * 16;
    }
    generateFunction(func) {
      this.currentFunction = func.name;
      this.varLocationMap.set(func.name, /* @__PURE__ */ new Map());
      this.functionEndLabel = this.generateLabel("function_end");
      this.regAlloc.reset();
      this.nextOffsetMap.set(func.name, 16);
      this.addLine(`	.globl	_${func.name}					 ; -- Begin function ${func.name}`);
      this.addLine("	.p2align	2");
      this.addLine(`_${func.name}:						 ; @${func.name}`);
      const totalStackSize = this.calculateStackSizeForFunction(func);
      this.addLine(`	sub	sp, sp, #${totalStackSize}`);
      this.addLine(`	stp	x29, x30, [sp, #${totalStackSize - 16}]`);
      this.addLine(`	add	x29, sp, #${totalStackSize - 16}`);
      for (let i = 0; i < func.params.length; i++) {
        const param = func.params[i];
        const offset = this.allocateStackSlot(func.name);
        this.setVarLocation(func.name, param.name, offset);
        if (i < 8) {
          this.addLine(`	str	x${i}, [sp, #${offset}]`);
        } else {
          throw new Error(
            `Function ${func.name} has more than 8 parameters, which is not supported`,
          );
        }
      }
      this.generateBlock(func.body);
      this.addLine(`${this.functionEndLabel}:`);
      this.addLine(`	ldp	x29, x30, [sp, #${totalStackSize - 16}]`);
      this.addLine(`	add	sp, sp, #${totalStackSize}`);
      this.addLine("	ret");
      this.addLine("							 ; -- End function");
    }
    generateBlock(block) {
      for (const stmt of block.statements) {
        this.generateStatement(stmt);
      }
    }
    generateReturnStatement(stmt) {
      if (stmt.type == "ReturnStatement" /* ReturnStatement */) {
        const exprCode = this.generateExpression(stmt.argument);
        this.addLines(exprCode);
      }
      this.addLine(`	b	${this.functionEndLabel}`);
    }
    /* visitor pattern for code generation */
    generateStatement(stmt) {
      switch (stmt.type) {
        case "ReturnStatement" /* ReturnStatement */:
          this.generateReturnStatement(stmt);
          break;
        case "BlockStatement" /* BlockStatement */:
          this.generateBlock(stmt);
          break;
        case "VariableDeclaration" /* VariableDeclaration */:
          const offset = this.allocateStackSlot(this.currentFunction);
          this.setVarLocation(this.currentFunction, stmt.name, offset);
          if (stmt.init.type === "NumberLiteral" /* NumberLiteral */) {
            this.addLine(
              `	mov	x8, #${stmt.init.value}				; =0x${stmt.init.value.toString(16)}`,
            );
            this.addLine(`	str	x8, [sp, #${offset}]`);
          } else {
            const initCode = this.generateExpression(stmt.init);
            this.addLines(initCode);
            this.addLine(`	str	x0, [sp, #${offset}]`);
          }
          break;
        case "ExpressionStatement" /* ExpressionStatement */:
          const exprCode = this.generateExpression(stmt.expression);
          this.addLines(exprCode);
          break;
        case "AssignmentStatement" /* AssignmentStatement */:
          this.generateAssignmentStatement(stmt);
          break;
        case "IfStatement" /* IfStatement */:
          this.generateIfStatement(stmt);
          break;
        case "WhileStatement" /* WhileStatement */:
          this.generateWhileStatement(stmt);
          break;
      }
    }
    /* Stack slot allocation - demonstrates memory layout management */
    allocateStackSlot(funcName) {
      const currentOffset = this.nextOffsetMap.get(funcName);
      this.nextOffsetMap.set(funcName, currentOffset + 8);
      return currentOffset;
    }
    generateWhileStatement(stmt) {
      const loopStart = this.generateLabel("loop_start");
      const loopEnd = this.generateLabel("loop_end");
      this.addLine(`${loopStart}:`);
      const conditionCode = this.generateExpression(stmt.condition);
      this.addLines(conditionCode);
      this.addLine("	cmp	x0, #0");
      this.addLine(`	beq	${loopEnd}`);
      if (stmt.body.type === "BlockStatement" /* BlockStatement */) {
        this.generateBlock(stmt.body);
      } else {
        this.generateStatement(stmt.body);
      }
      this.addLine(`	b	${loopStart}`);
      this.addLine(`${loopEnd}:`);
    }
    generateIfStatement(stmt) {
      const endLabel = this.generateLabel("endif");
      const elseLabel = stmt.elseBranch ? this.generateLabel("else") : endLabel;
      const conditionCode = this.generateExpression(stmt.condition);
      this.addLines(conditionCode);
      this.addLine("	cmp	x0, #0");
      this.addLine(`	beq	${elseLabel}`);
      if (stmt.thenBranch.type === "BlockStatement" /* BlockStatement */) {
        this.generateBlock(stmt.thenBranch);
      } else {
        this.generateStatement(stmt.thenBranch);
      }
      if (stmt.elseBranch) {
        this.addLine(`	b	${endLabel}`);
        this.addLine(`${elseLabel}:`);
        if (stmt.elseBranch.type === "BlockStatement" /* BlockStatement */) {
          this.generateBlock(stmt.elseBranch);
        } else {
          this.generateStatement(stmt.elseBranch);
        }
      }
      this.addLine(`${endLabel}:`);
    }
    /* recursive descent pattern */
    generateExpression(expr) {
      switch (expr.type) {
        case "BinaryExpression" /* BinaryExpression */:
          return this.generateBinaryExpression(expr);
        case "UnaryExpression" /* UnaryExpression */:
          return this.generateUnaryExpression(expr);
        case "FunctionCall" /* FunctionCall */:
          return this.generateFunctionCall(expr);
        case "Identifier" /* Identifier */:
          return this.generateIdentifier(expr);
        case "NumberLiteral" /* NumberLiteral */:
          return this.generateNumberLiteral(expr);
        case "VoidExpression" /* VoidExpression */:
          return [];
        default:
          return [];
      }
    }
    generateUnaryExpression(expr) {
      const result = [];
      switch (expr.operator) {
        case "&":
          if (expr.operand.type === "Identifier" /* Identifier */) {
            const offset = this.getVarLocation(
              this.currentFunction,
              expr.operand.name,
            );
            if (!offset) {
              throw new Error(`Variable not found: ${expr.operand.name}`);
            }
            result.push(`	add	x0, sp, #${offset}`);
          } else {
            throw new Error(
              "Address-of operator can only be applied to variables",
            );
          }
          break;
        case "*":
          const addressCode = this.generateExpression(expr.operand);
          result.push(...addressCode);
          result.push(`	ldr	x0, [x0]`);
          break;
        default:
          throw new Error(`Unsupported unary operator: ${expr.operator}`);
      }
      return result;
    }
    generateBinaryExpression(expr) {
      const result = [];
      if (!this.regAlloc.hasAvailable()) {
        return this.generateBinaryExpressionStackBased(expr);
      }
      const leftCode = this.generateExpression(expr.left);
      result.push(...leftCode);
      const leftReg = this.regAlloc.allocate();
      result.push(`	mov	${leftReg}, x0`);
      const rightCode = this.generateExpression(expr.right);
      result.push(...rightCode);
      const rightReg = this.regAlloc.allocate();
      result.push(`	mov	${rightReg}, x0`);
      switch (expr.operator) {
        case "*":
          result.push(`	mul	x0, ${leftReg}, ${rightReg}`);
          break;
        case "+":
          result.push(`	add	x0, ${leftReg}, ${rightReg}`);
          break;
        case "-":
          result.push(`	sub	x0, ${leftReg}, ${rightReg}`);
          break;
        case "/":
          result.push(`	sdiv	x0, ${leftReg}, ${rightReg}`);
          break;
        case "<":
          result.push(`	cmp	${leftReg}, ${rightReg}`);
          result.push("	cset	x0, lt");
          break;
        case ">":
          result.push(`	cmp	${leftReg}, ${rightReg}`);
          result.push("	cset	x0, gt");
          break;
        case "==":
          result.push(`	cmp	${leftReg}, ${rightReg}`);
          result.push("	cset	x0, eq");
          break;
        default:
          throw new Error(`Unsupported binary operator: ${expr.operator}`);
      }
      this.regAlloc.release(leftReg);
      this.regAlloc.release(rightReg);
      return result;
    }
    /* stack-based expression evaluation for when no available registers */
    generateBinaryExpressionStackBased(expr) {
      const result = [];
      const leftCode = this.generateExpression(expr.left);
      result.push(...leftCode);
      result.push("	sub	sp, sp, #16");
      result.push("	str	x0, [sp]");
      const rightCode = this.generateExpression(expr.right);
      result.push(...rightCode);
      result.push("	mov	x9, x0");
      result.push("	ldr	x8, [sp]");
      result.push("	add	sp, sp, #16");
      switch (expr.operator) {
        case "*":
          result.push("	mul	x0, x8, x9");
          break;
        case "+":
          result.push("	add	x0, x8, x9");
          break;
        case "-":
          result.push("	sub	x0, x8, x9");
          break;
        case "/":
          result.push("	sdiv	x0, x8, x9");
          break;
        case "<":
          result.push("	cmp	x8, x9");
          result.push("	cset	x0, lt");
          break;
        case ">":
          result.push("	cmp	x8, x9");
          result.push("	cset	x0, gt");
          break;
        case "==":
          result.push("	cmp	x8, x9");
          result.push("	cset	x0, eq");
          break;
        default:
          throw new Error(`Unsupported binary operator: ${expr.operator}`);
      }
      return result;
    }
    generateFunctionCall(expr) {
      if (expr.callee in this.specialFunctions) {
        return this.specialFunctions[expr.callee](expr.arguments);
      }
      const result = [];
      if (expr.arguments.length > 8) {
        throw new Error("More than 8 function arguments not supported");
      }
      if (expr.arguments.length === 0) {
        result.push(`	bl	_${expr.callee}`);
        return result;
      }
      if (expr.arguments.length === 1) {
        const argCode = this.generateExpression(expr.arguments[0]);
        result.push(...argCode);
        result.push(`	bl	_${expr.callee}`);
        return result;
      }
      const tempStackOffsets = [];
      for (let i = 0; i < expr.arguments.length; i++) {
        const argCode = this.generateExpression(expr.arguments[i]);
        result.push(...argCode);
        const tempOffset = this.allocateStackSlot(this.currentFunction);
        tempStackOffsets.push(tempOffset);
        result.push(`	str	x0, [sp, #${tempOffset}]`);
      }
      for (let i = 0; i < expr.arguments.length; i++) {
        const tempOffset = tempStackOffsets[i];
        result.push(`	ldr	x${i}, [sp, #${tempOffset}]`);
      }
      result.push(`	bl	_${expr.callee}`);
      return result;
    }
    /* variable access code generation; symbol table lookup */
    generateIdentifier(expr) {
      const offset = this.getVarLocation(this.currentFunction, expr.name);
      if (!offset) {
        throw new Error(
          `Variable not found: ${expr.name} in function ${this.currentFunction}`,
        );
      }
      return [`	ldr	x0, [sp, #${offset}]`];
    }
    /* literal constant loading; demonstrates immediate value handling */
    generateNumberLiteral(expr) {
      return [`	mov	x0, #${expr.value}				; =0x${expr.value.toString(16)}`];
    }
    generateLabel(prefix) {
      const label = `L${this.labelCounter++}_${prefix}`;
      return label;
    }
    addLine(line) {
      this.output.push(line);
    }
    addLines(lines) {
      this.output.push(...lines);
    }
    /* variable location tracking; maintains symbol table per function */
    setVarLocation(funcName, varName, offset) {
      let varMap = this.varLocationMap.get(funcName);
      if (!varMap) {
        varMap = /* @__PURE__ */ new Map();
        this.varLocationMap.set(funcName, varMap);
      }
      varMap.set(varName, offset);
    }
    getVarLocation(funcName, varName) {
      const varMap = this.varLocationMap.get(funcName);
      if (!varMap) {
        return void 0;
      }
      return varMap.get(varName);
    }
    addStringLiteral(value) {
      const label = `l_.str.${this.stringLiteralCounter++}`;
      this.stringLiterals.set(label, value);
      return label;
    }
  };

  // src/interpreter.ts
  var ARM64Interpreter = class {
    registers = /* @__PURE__ */ new Map();
    stack = /* @__PURE__ */ new Map();
    stackPointer = 0x7fff0000n;
    framePointer = 0x7fff0000n;
    linkRegister = 0n;
    instructions = [];
    pc = 0;
    labels = /* @__PURE__ */ new Map();
    running = false;
    stringLiterals = /* @__PURE__ */ new Map();
    output = [];
    callStack = [];
    initializeRegisters() {
      for (let i = 0; i <= 30; i++) {
        this.registers.set(`x${i}`, 0n);
      }
      this.registers.set("sp", this.stackPointer);
      this.registers.set("x29", this.framePointer);
      this.registers.set("x30", this.linkRegister);
    }
    load(assembly) {
      this.initializeRegisters();
      this.instructions = [];
      this.labels.clear();
      this.stringLiterals.clear();
      this.pc = 0;
      const lines = assembly.split("\n").map((line) => line.trim());
      let currentSection = "";
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line === "" || line.startsWith(";") || line.startsWith("//")) {
          continue;
        }
        if (line.startsWith(".section")) {
          currentSection = line;
          continue;
        }
        if (line.startsWith(".") && !line.includes(":")) {
          continue;
        }
        if (line.includes(":")) {
          const labelName = line.substring(0, line.indexOf(":")).trim();
          this.labels.set(labelName, this.instructions.length);
          if (currentSection.includes("cstring")) {
            const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : "";
            if (nextLine.startsWith(".asciz")) {
              const stringValue = this.parseStringLiteral(nextLine);
              this.stringLiterals.set(labelName, stringValue);
              i++;
            }
          }
          continue;
        }
        const instruction = this.parseInstruction(line);
        if (instruction) {
          this.instructions.push(instruction);
        }
      }
      return this;
    }
    parseStringLiteral(line) {
      const match = line.match(/\.asciz\s+"([^"]*)"/);
      return match ? match[1] : "";
    }
    parseInstruction(line) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(".") || trimmed.startsWith(";")) {
        return null;
      }
      const commentIndex = trimmed.indexOf(";");
      const instruction =
        commentIndex >= 0 ? trimmed.substring(0, commentIndex).trim() : trimmed;
      const parts = instruction.split(/\s+/);
      const opcode = parts[0];
      const operandString = parts.slice(1).join(" ");
      const operands = [];
      let current = "";
      let inBrackets = false;
      let i = 0;
      while (i < operandString.length) {
        const char = operandString[i];
        if (char === "[") {
          inBrackets = true;
          current += char;
        } else if (char === "]") {
          inBrackets = false;
          current += char;
        } else if (char === "," && !inBrackets) {
          if (current.trim()) {
            operands.push(current.trim());
          }
          current = "";
        } else {
          current += char;
        }
        i++;
      }
      if (current.trim()) {
        operands.push(current.trim());
      }
      return {
        opcode: opcode.toLowerCase(),
        operands,
        original: line,
      };
    }
    run() {
      this.running = true;
      this.output = [];
      this.pc = 0;
      this.callStack = [];
      const mainLabel = this.labels.get("_main");
      if (mainLabel !== void 0) {
        this.pc = mainLabel;
      }
      let stepCount = 0;
      const maxSteps = 1e4;
      try {
        while (
          this.running &&
          this.pc < this.instructions.length &&
          stepCount < maxSteps
        ) {
          this.executeInstruction(this.instructions[this.pc]);
          stepCount++;
        }
        if (stepCount >= maxSteps) {
          throw new Error("Execution timeout - possible infinite loop");
        }
        return {
          success: true,
          output: this.output.join("\n"),
          returnValue: Number(this.registers.get("x0") || 0n),
          steps: stepCount,
        };
      } catch (error) {
        return {
          success: false,
          output: this.output.join("\n"),
          error: error instanceof Error ? error.message : String(error),
          returnValue: -1,
          steps: stepCount,
        };
      }
    }
    executeInstruction(instruction) {
      const { opcode, operands } = instruction;
      switch (opcode) {
        case "mov":
          this.executeMov(operands);
          break;
        case "add":
          this.executeAdd(operands);
          break;
        case "sub":
          this.executeSub(operands);
          break;
        case "mul":
          this.executeMul(operands);
          break;
        case "ldr":
          this.executeLdr(operands);
          break;
        case "str":
          this.executeStr(operands);
          break;
        case "stp":
          this.executeStp(operands);
          break;
        case "ldp":
          this.executeLdp(operands);
          break;
        case "bl":
          this.executeBl(operands);
          break;
        case "ret":
          this.executeRet();
          break;
        case "cmp":
          this.executeCmp(operands);
          break;
        case "beq":
        case "bne":
        case "blt":
        case "ble":
        case "bgt":
        case "bge":
          this.executeBranch(opcode, operands);
          break;
        case "b":
          this.executeB(operands);
          break;
        case "cset":
          this.executeCset(operands);
          break;
        case "svc":
          this.handleSysCall(operands);
          break;
        default:
          this.pc++;
          break;
      }
    }
    handleSysCall(operands) {
      if (operands[0] == "#0x80") {
        this.running = false;
      }
    }
    executeMov(operands) {
      const dest = operands[0];
      const src = operands[1];
      if (src.startsWith("#")) {
        const value = this.parseImmediate(src);
        this.setRegister(dest, value);
      } else {
        const value = this.getRegister(src);
        this.setRegister(dest, value);
      }
      this.pc++;
    }
    executeAdd(operands) {
      const dest = operands[0];
      const src1 = operands[1];
      const src2 = operands[2];
      const val1 = this.getRegister(src1);
      let val2;
      if (src2.startsWith("#")) {
        val2 = this.parseImmediate(src2);
      } else {
        val2 = this.getRegister(src2);
      }
      this.setRegister(dest, val1 + val2);
      this.pc++;
    }
    executeSub(operands) {
      const dest = operands[0];
      const src1 = operands[1];
      const src2 = operands[2];
      const val1 = this.getRegister(src1);
      let val2;
      if (src2.startsWith("#")) {
        val2 = this.parseImmediate(src2);
      } else {
        val2 = this.getRegister(src2);
      }
      this.setRegister(dest, val1 - val2);
      this.pc++;
    }
    executeMul(operands) {
      const dest = operands[0];
      const src1 = operands[1];
      const src2 = operands[2];
      const val1 = this.getRegister(src1);
      const val2 = this.getRegister(src2);
      this.setRegister(dest, val1 * val2);
      this.pc++;
    }
    executeLdr(operands) {
      const dest = operands[0];
      const src = operands[1];
      const address = this.parseMemoryOperand(src);
      const value = this.loadFromMemory(address);
      this.setRegister(dest, value);
      this.pc++;
    }
    executeStr(operands) {
      const src = operands[0];
      const dest = operands[1];
      const value = this.getRegister(src);
      const address = this.parseMemoryOperand(dest);
      this.storeToMemory(address, value);
      this.pc++;
    }
    executeStp(operands) {
      const reg1 = operands[0];
      const reg2 = operands[1];
      const memOp = operands[2];
      const val1 = this.getRegister(reg1);
      const val2 = this.getRegister(reg2);
      const baseAddr = this.parseMemoryOperand(memOp);
      this.storeToMemory(baseAddr, val1);
      this.storeToMemory(baseAddr + 8n, val2);
      this.pc++;
    }
    executeLdp(operands) {
      const reg1 = operands[0];
      const reg2 = operands[1];
      const memOp = operands[2];
      const baseAddr = this.parseMemoryOperand(memOp);
      const val1 = this.loadFromMemory(baseAddr);
      const val2 = this.loadFromMemory(baseAddr + 8n);
      this.setRegister(reg1, val1);
      this.setRegister(reg2, val2);
      this.pc++;
    }
    executeBl(operands) {
      const target = operands[0];
      if (target === "_printf") {
        this.handlePrintf();
      } else if (target === "_exit") {
        this.running = false;
        return;
      } else {
        this.setRegister("x30", BigInt(this.pc + 1));
        this.callStack.push(this.pc + 1);
        const targetLabel = target.startsWith("_") ? target : `_${target}`;
        const targetPC = this.labels.get(targetLabel);
        if (targetPC !== void 0) {
          this.pc = targetPC;
          return;
        }
      }
      this.pc++;
    }
    executeRet() {
      if (this.callStack.length > 0) {
        this.pc = this.callStack.pop();
      } else {
        this.running = false;
      }
    }
    executeCmp(operands) {
      const reg1 = operands[0];
      const reg2 = operands[1];
      const val1 = this.getRegister(reg1);
      let val2;
      if (reg2.startsWith("#")) {
        val2 = this.parseImmediate(reg2);
      } else {
        val2 = this.getRegister(reg2);
      }
      this.registers.set("_cmp_result", val1 - val2);
      this.pc++;
    }
    executeBranch(opcode, operands) {
      const target = operands[0];
      const cmpResult = this.registers.get("_cmp_result") || 0n;
      let shouldBranch = false;
      switch (opcode) {
        case "beq":
          shouldBranch = cmpResult === 0n;
          break;
        case "bne":
          shouldBranch = cmpResult !== 0n;
          break;
        case "blt":
          shouldBranch = cmpResult < 0n;
          break;
        case "ble":
          shouldBranch = cmpResult <= 0n;
          break;
        case "bgt":
          shouldBranch = cmpResult > 0n;
          break;
        case "bge":
          shouldBranch = cmpResult >= 0n;
          break;
      }
      if (shouldBranch) {
        const targetPC = this.labels.get(target);
        if (targetPC !== void 0) {
          this.pc = targetPC;
          return;
        }
      }
      this.pc++;
    }
    executeB(operands) {
      const target = operands[0];
      const targetPC = this.labels.get(target);
      if (targetPC !== void 0) {
        this.pc = targetPC;
      } else {
        this.pc++;
      }
    }
    executeCset(operands) {
      const dest = operands[0];
      const condition = operands[1];
      const cmpResult = this.registers.get("_cmp_result") || 0n;
      let conditionMet = false;
      switch (condition.toLowerCase()) {
        case "eq":
          conditionMet = cmpResult === 0n;
          break;
        case "ne":
          conditionMet = cmpResult !== 0n;
          break;
        case "lt":
          conditionMet = cmpResult < 0n;
          break;
        case "le":
          conditionMet = cmpResult <= 0n;
          break;
        case "gt":
          conditionMet = cmpResult > 0n;
          break;
        case "ge":
          conditionMet = cmpResult >= 0n;
          break;
        case "cs":
        case "hs":
          conditionMet = cmpResult >= 0n;
          break;
        case "cc":
        case "lo":
          conditionMet = cmpResult < 0n;
          break;
        case "mi":
          conditionMet = cmpResult < 0n;
          break;
        case "pl":
          conditionMet = cmpResult >= 0n;
          break;
        case "vs":
        case "vc":
          conditionMet = false;
          break;
        case "hi":
          conditionMet = cmpResult > 0n;
          break;
        case "ls":
          conditionMet = cmpResult <= 0n;
          break;
        default:
          throw new Error(`Unknown condition code: ${condition}`);
      }
      this.setRegister(dest, conditionMet ? 1n : 0n);
      this.pc++;
    }
    handlePrintf() {
      const value = this.getRegister("x0");
      this.output.push(value.toString());
    }
    parseMemoryOperand(operand) {
      const cleaned = operand.replace(/[\[\]]/g, "");
      if (cleaned.includes(",")) {
        const parts = cleaned.split(",").map((p) => p.trim());
        const baseReg = parts[0];
        const offset = this.parseImmediate(parts[1]);
        return this.getRegister(baseReg) + offset;
      } else {
        return this.getRegister(cleaned);
      }
    }
    parseImmediate(immediate) {
      const cleaned = immediate.replace("#", "");
      if (cleaned.startsWith("0x")) {
        return BigInt(cleaned);
      } else {
        return BigInt(cleaned);
      }
    }
    getRegister(name) {
      if (name === "sp") {
        return this.stackPointer;
      }
      return this.registers.get(name) || 0n;
    }
    setRegister(name, value) {
      this.registers.set(name, value);
      if (name === "sp") {
        this.stackPointer = value;
      } else if (name === "x29") {
        this.framePointer = value;
      } else if (name === "x30") {
        this.linkRegister = value;
      }
    }
    loadFromMemory(address) {
      return this.stack.get(address) || 0n;
    }
    storeToMemory(address, value) {
      this.stack.set(address, value);
    }
    /*debug */
    getState() {
      return {
        registers: Object.fromEntries(this.registers),
        stackPointer: this.stackPointer,
        framePointer: this.framePointer,
        pc: this.pc,
        output: this.output.join("\n"),
        running: this.running,
      };
    }
    reset() {
      this.initializeRegisters();
      this.stack.clear();
      this.instructions = [];
      this.labels.clear();
      this.stringLiterals.clear();
      this.output = [];
      this.pc = 0;
      this.running = false;
      this.callStack = [];
      this.stackPointer = 0x7fff0000n;
      this.framePointer = 0x7fff0000n;
      this.linkRegister = 0n;
    }
  };

  // src/optimiser.ts
  var Optimizer = class {
    stats;
    constantValues;
    usedVariables;
    currentPassStats;
    currentPhase;
    phaseChanged = false;
    hasPointers = false;
    pointerVariables;
    /*variables declared as pointer types*/
    pointerReferencedVariables;
    /*variables with address taken (&var)*/
    program;
    load(program) {
      this.resetStats();
      this.program = this.deepClone(program);
      return this;
    }
    resetStats() {
      this.stats = {
        passes: 0,
        constantFolding: 0,
        constantPropagation: 0,
        deadCodeElimination: 0,
        algebraicSimplification: 0,
        totalOptimizations: 0,
        functionsRemoved: 0,
        pointersDetected: 0,
      };
      this.constantValues = {};
      this.usedVariables = /* @__PURE__ */ new Set();
      this.pointerVariables = /* @__PURE__ */ new Set();
      this.pointerReferencedVariables = /* @__PURE__ */ new Set();
      this.resetPassStats();
    }
    resetPassStats() {
      this.currentPassStats = {
        constantFolding: 0,
        constantPropagation: 0,
        deadCodeElimination: 0,
        algebraicSimplification: 0,
      };
    }
    /* multi-pass optimization with fixed-point iteration (runs until a pass didn't yield a change)*/
    run(maxPasses = 10) {
      this.resetStats();
      this.detectPointers(this.program);
      if (this.hasPointers) {
        this.stats.pointersDetected =
          this.pointerVariables.size + this.pointerReferencedVariables.size;
      }
      let passChanged = true;
      while (passChanged && this.stats.passes < maxPasses) {
        this.stats.passes++;
        this.resetPassStats();
        passChanged = false;
        this.currentPhase = "Dead Code Elimination" /* DeadCodeElimination */;
        this.phaseChanged = false;
        this.constantValues = {};
        this.usedVariables = /* @__PURE__ */ new Set();
        this.collectUsedVariables(this.program);
        this.program = this.runDeadCodeElimination(this.program);
        if (this.phaseChanged) {
          passChanged = true;
        }
        this.currentPhase = "Constant Propagation" /* ConstantPropagation */;
        this.phaseChanged = false;
        this.constantValues = {};
        this.program = this.runConstantPropagation(this.program);
        if (this.phaseChanged) {
          passChanged = true;
        }
        this.currentPhase = "Constant Folding" /* ConstantFolding */;
        this.phaseChanged = false;
        this.program = this.runConstantFolding(this.program);
        if (this.phaseChanged) {
          passChanged = true;
        }
        this.stats.constantFolding += this.currentPassStats.constantFolding;
        this.stats.constantPropagation +=
          this.currentPassStats.constantPropagation;
        this.stats.deadCodeElimination +=
          this.currentPassStats.deadCodeElimination;
        this.stats.algebraicSimplification +=
          this.currentPassStats.algebraicSimplification;
      }
      this.stats.totalOptimizations =
        this.stats.constantFolding +
        this.stats.constantPropagation +
        this.stats.deadCodeElimination +
        this.stats.algebraicSimplification;
      if (this.program.functions.length === 0) {
        throw new Error("Program needs at least one function");
      }
      const mainFunction = this.program.functions.find(
        (f) => f.name === "main",
      );
      if (!mainFunction) {
        throw new Error("Program needs a main function");
      }
      const calledFunctions = /* @__PURE__ */ new Set();
      const functionQueue = [mainFunction];
      while (functionQueue.length > 0) {
        const currentFunction = functionQueue.shift();
        if (calledFunctions.has(currentFunction.name)) {
          continue;
        }
        calledFunctions.add(currentFunction.name);
        this.findFunctionCalls(currentFunction).forEach((funcName) => {
          const calledFunc = this.program.functions.find(
            (f) => f.name === funcName,
          );
          if (calledFunc && !calledFunctions.has(funcName)) {
            functionQueue.push(calledFunc);
          }
        });
      }
      const originalFunctionCount = this.program.functions.length;
      const removedFunctions = this.program.functions
        .filter((f) => !calledFunctions.has(f.name))
        .map((f) => f.name);
      this.program.functions = this.program.functions.filter((f) =>
        calledFunctions.has(f.name),
      );
      this.stats.functionsRemoved =
        originalFunctionCount - calledFunctions.size;
      return { asm: this.program, stats: { ...this.stats } };
    }
    detectPointers(program) {
      this.hasPointers = false;
      this.pointerVariables.clear();
      this.pointerReferencedVariables.clear();
      for (const func of program.functions) {
        this.detectPointersInFunction(func);
      }
    }
    detectPointersInFunction(func) {
      if (func.returnType.includes("*")) {
        this.hasPointers = true;
      }
      for (const param of func.params) {
        if (param.paramType.includes("*")) {
          this.hasPointers = true;
          this.pointerVariables.add(param.name);
        }
      }
      this.detectPointersInStatement(func.body);
    }
    detectPointersInStatement(stmt) {
      switch (stmt.type) {
        case "VariableDeclaration" /* VariableDeclaration */:
          const varDecl = stmt;
          if (varDecl.varType.includes("*")) {
            this.hasPointers = true;
            this.pointerVariables.add(varDecl.name);
          }
          this.detectPointersInExpression(varDecl.init);
          break;
        case "AssignmentStatement" /* AssignmentStatement */:
          const assignment = stmt;
          if (typeof assignment.target !== "string") {
            this.hasPointers = true;
          }
          this.detectPointersInExpression(assignment.value);
          break;
        case "ExpressionStatement" /* ExpressionStatement */:
          this.detectPointersInExpression(stmt.expression);
          break;
        case "ReturnStatement" /* ReturnStatement */:
          this.detectPointersInExpression(stmt.argument);
          break;
        case "IfStatement" /* IfStatement */:
          const ifStmt = stmt;
          this.detectPointersInExpression(ifStmt.condition);
          this.detectPointersInStatement(ifStmt.thenBranch);
          if (ifStmt.elseBranch) {
            this.detectPointersInStatement(ifStmt.elseBranch);
          }
          break;
        case "WhileStatement" /* WhileStatement */:
          const whileStmt = stmt;
          this.detectPointersInExpression(whileStmt.condition);
          this.detectPointersInStatement(whileStmt.body);
          break;
        case "BlockStatement" /* BlockStatement */:
          const block = stmt;
          for (const s of block.statements) {
            this.detectPointersInStatement(s);
          }
          break;
      }
    }
    detectPointersInExpression(expr) {
      switch (expr.type) {
        case "UnaryExpression" /* UnaryExpression */:
          const unaryExpr = expr;
          this.hasPointers = true;
          if (unaryExpr.operator === "&") {
            if (unaryExpr.operand.type === "Identifier" /* Identifier */) {
              const varName = unaryExpr.operand.name;
              this.pointerReferencedVariables.add(varName);
            }
          } else if (unaryExpr.operator === "*") {
          }
          this.detectPointersInExpression(unaryExpr.operand);
          break;
        case "BinaryExpression" /* BinaryExpression */:
          const binExpr = expr;
          this.detectPointersInExpression(binExpr.left);
          this.detectPointersInExpression(binExpr.right);
          break;
        case "FunctionCall" /* FunctionCall */:
          const funcCall = expr;
          for (const arg of funcCall.arguments) {
            this.detectPointersInExpression(arg);
          }
          break;
        /* identifier and NumberLiteral are safe by themselves */
        default:
          break;
      }
    }
    canOptimizeVariable(varName) {
      if (!this.hasPointers) return true;
      const isPointer = this.pointerVariables.has(varName);
      const hasAddressTaken = this.pointerReferencedVariables.has(varName);
      if (isPointer || hasAddressTaken) {
        return false;
      }
      return true;
    }
    containsPointerOperations(expr) {
      switch (expr.type) {
        case "UnaryExpression" /* UnaryExpression */:
          const unaryExpr = expr;
          return unaryExpr.operator === "&" || unaryExpr.operator === "*";
        case "BinaryExpression" /* BinaryExpression */:
          const binExpr = expr;
          return (
            this.containsPointerOperations(binExpr.left) ||
            this.containsPointerOperations(binExpr.right)
          );
        case "FunctionCall" /* FunctionCall */:
          const funcCall = expr;
          return funcCall.arguments.some((arg) =>
            this.containsPointerOperations(arg),
          );
        case "Identifier" /* Identifier */:
          const id = expr;
          return this.pointerVariables.has(id.name);
        default:
          return false;
      }
    }
    statementInvolvesPointers(stmt) {
      switch (stmt.type) {
        case "VariableDeclaration" /* VariableDeclaration */:
          const varDecl = stmt;
          return (
            varDecl.varType.includes("*") ||
            this.containsPointerOperations(varDecl.init)
          );
        case "AssignmentStatement" /* AssignmentStatement */:
          const assignment = stmt;
          if (typeof assignment.target !== "string") {
            return true;
          }
          if (!this.canOptimizeVariable(assignment.target)) {
            return true;
          }
          return this.containsPointerOperations(assignment.value);
        case "ExpressionStatement" /* ExpressionStatement */:
          return this.containsPointerOperations(stmt.expression);
        case "ReturnStatement" /* ReturnStatement */:
          return this.containsPointerOperations(stmt.argument);
        case "IfStatement" /* IfStatement */:
          const ifStmt = stmt;
          return this.containsPointerOperations(ifStmt.condition);
        case "WhileStatement" /* WhileStatement */:
          const whileStmt = stmt;
          return this.containsPointerOperations(whileStmt.condition);
        default:
          return false;
      }
    }
    findFunctionCalls(func) {
      const calls = [];
      const findCallsInExpression = (expr) => {
        if (expr.type === "FunctionCall" /* FunctionCall */) {
          const funcCall = expr;
          calls.push(funcCall.callee);
          funcCall.arguments.forEach(findCallsInExpression);
        } else if (expr.type === "BinaryExpression" /* BinaryExpression */) {
          const binExpr = expr;
          findCallsInExpression(binExpr.left);
          findCallsInExpression(binExpr.right);
        } else if (expr.type === "UnaryExpression" /* UnaryExpression */) {
          const unaryExpr = expr;
          findCallsInExpression(unaryExpr.operand);
        }
      };
      const findCallsInStatement = (stmt) => {
        switch (stmt.type) {
          case "ExpressionStatement" /* ExpressionStatement */:
            findCallsInExpression(stmt.expression);
            break;
          case "ReturnStatement" /* ReturnStatement */:
            findCallsInExpression(stmt.argument);
            break;
          case "VariableDeclaration" /* VariableDeclaration */:
            findCallsInExpression(stmt.init);
            break;
          case "AssignmentStatement" /* AssignmentStatement */:
            findCallsInExpression(stmt.value);
            break;
          case "IfStatement" /* IfStatement */:
            const ifStmt = stmt;
            findCallsInExpression(ifStmt.condition);
            findCallsInStatement(ifStmt.thenBranch);
            if (ifStmt.elseBranch) {
              findCallsInStatement(ifStmt.elseBranch);
            }
            break;
          case "WhileStatement" /* WhileStatement */:
            const whileStmt = stmt;
            findCallsInExpression(whileStmt.condition);
            findCallsInStatement(whileStmt.body);
            break;
          case "BlockStatement" /* BlockStatement */:
            stmt.statements.forEach(findCallsInStatement);
            break;
        }
      };
      findCallsInStatement(func.body);
      return calls;
    }
    runDeadCodeElimination(program) {
      return {
        type: "Program" /* Program */,
        functions: program.functions.map((func) => this.dceFunction(func)),
      };
    }
    dceFunction(func) {
      return {
        ...func,
        body: this.dceBlock(func.body),
      };
    }
    dceBlock(block) {
      const statements = [];
      let foundReturn = false;
      for (const stmt of block.statements) {
        if (foundReturn) {
          this.currentPassStats.deadCodeElimination++;
          this.phaseChanged = true;
          continue;
        }
        const processed = this.dceStatement(stmt);
        if (processed !== null) {
          statements.push(processed);
          if (processed.type === "ReturnStatement" /* ReturnStatement */) {
            foundReturn = true;
          }
        }
      }
      return {
        type: "BlockStatement" /* BlockStatement */,
        statements,
      };
    }
    dceStatement(stmt) {
      if (this.statementInvolvesPointers(stmt)) {
        return stmt;
      }
      switch (stmt.type) {
        case "VariableDeclaration" /* VariableDeclaration */:
          const varDecl = stmt;
          if (
            !this.usedVariables.has(varDecl.name) &&
            !this.hasSideEffects(varDecl.init) &&
            this.canOptimizeVariable(varDecl.name)
          ) {
            this.currentPassStats.deadCodeElimination++;
            this.phaseChanged = true;
            return null;
          }
          return stmt;
        case "AssignmentStatement" /* AssignmentStatement */:
          const assignment = stmt;
          if (
            typeof assignment.target === "string" &&
            !this.usedVariables.has(assignment.target) &&
            !this.hasSideEffects(assignment.value) &&
            this.canOptimizeVariable(assignment.target)
          ) {
            this.currentPassStats.deadCodeElimination++;
            this.phaseChanged = true;
            return null;
          }
          return stmt;
        case "IfStatement" /* IfStatement */:
          const ifStmt = stmt;
          const condition = ifStmt.condition;
          if (
            condition.type === "NumberLiteral" /* NumberLiteral */ &&
            !this.containsPointerOperations(condition)
          ) {
            const condValue = condition.value;
            this.currentPassStats.deadCodeElimination++;
            this.phaseChanged = true;
            if (condValue !== 0) {
              return this.cfStatement(ifStmt.thenBranch);
            } else {
              return ifStmt.elseBranch
                ? this.cfStatement(ifStmt.elseBranch)
                : {
                    type: "BlockStatement" /* BlockStatement */,
                    statements: [],
                  };
            }
          }
          const thenBranch = this.dceStatement(ifStmt.thenBranch);
          const elseBranch = ifStmt.elseBranch
            ? this.dceStatement(ifStmt.elseBranch)
            : null;
          if (!thenBranch && !elseBranch) {
            return null;
          }
          return {
            ...ifStmt,
            thenBranch: thenBranch || {
              type: "BlockStatement" /* BlockStatement */,
              statements: [],
            },
            elseBranch,
          };
        case "WhileStatement" /* WhileStatement */:
          const whileStmt = stmt;
          const body = this.dceStatement(whileStmt.body);
          if (!body) {
            return null;
          }
          return {
            ...whileStmt,
            body,
          };
        case "BlockStatement" /* BlockStatement */:
          return this.dceBlock(stmt);
        case "ExpressionStatement" /* ExpressionStatement */:
          const exprStmt = stmt;
          if (!this.hasSideEffects(exprStmt.expression)) {
            this.currentPassStats.deadCodeElimination++;
            this.phaseChanged = true;
            return null;
          }
          return stmt;
        default:
          return stmt;
      }
    }
    runConstantPropagation(program) {
      return {
        type: "Program" /* Program */,
        functions: program.functions.map((func) => this.cpFunction(func)),
      };
    }
    cpFunction(func) {
      this.constantValues = {};
      return {
        ...func,
        body: this.cpBlock(func.body),
      };
    }
    cpBlock(block) {
      return {
        type: "BlockStatement" /* BlockStatement */,
        statements: block.statements.map((stmt) => this.cpStatement(stmt)),
      };
    }
    cpStatement(stmt) {
      if (this.statementInvolvesPointers(stmt)) {
        return stmt;
      }
      switch (stmt.type) {
        case "VariableDeclaration" /* VariableDeclaration */: {
          const varDecl = stmt;
          const init = this.cpExpression(varDecl.init);
          if (
            init.type === "NumberLiteral" /* NumberLiteral */ &&
            this.canOptimizeVariable(varDecl.name)
          ) {
            this.constantValues[varDecl.name] = init.value;
          }
          return {
            ...varDecl,
            init,
          };
        }
        case "AssignmentStatement" /* AssignmentStatement */:
          const assignment = stmt;
          const value = this.cpExpression(assignment.value);
          if (
            typeof assignment.target === "string" &&
            this.canOptimizeVariable(assignment.target)
          ) {
            if (value.type === "NumberLiteral" /* NumberLiteral */) {
              this.constantValues[assignment.target] = value.value;
            } else {
              delete this.constantValues[assignment.target];
            }
          }
          return {
            ...assignment,
            value,
          };
        case "IfStatement" /* IfStatement */: {
          const ifStmt = stmt;
          const condition2 = this.cpExpression(ifStmt.condition);
          if (condition2.type === "NumberLiteral" /* NumberLiteral */) {
            const condValue = condition2.value;
            this.currentPassStats.constantPropagation++;
            this.phaseChanged = true;
            if (condValue !== 0) {
              return this.cpStatement(ifStmt.thenBranch);
            } else {
              return ifStmt.elseBranch
                ? this.cpStatement(ifStmt.elseBranch)
                : {
                    type: "BlockStatement" /* BlockStatement */,
                    statements: [],
                  };
            }
          }
          const savedConstants2 = { ...this.constantValues };
          const thenBranch = this.cpStatement(ifStmt.thenBranch);
          const thenConstants = { ...this.constantValues };
          this.constantValues = { ...savedConstants2 };
          const elseBranch = ifStmt.elseBranch
            ? this.cpStatement(ifStmt.elseBranch)
            : null;
          const elseConstants = { ...this.constantValues };
          this.constantValues = {};
          for (const varName in savedConstants2) {
            const originalValue = savedConstants2[varName];
            const thenValue = thenConstants[varName];
            const elseValue = elseConstants[varName];
            if (
              thenValue !== void 0 &&
              elseValue !== void 0 &&
              thenValue === elseValue
            ) {
              this.constantValues[varName] = thenValue;
            } else if (
              !ifStmt.elseBranch &&
              thenValue !== void 0 &&
              thenValue === originalValue
            ) {
              this.constantValues[varName] = originalValue;
            } else if (!ifStmt.elseBranch && originalValue !== void 0) {
              if (
                !(varName in thenConstants) ||
                thenConstants[varName] === originalValue
              ) {
                this.constantValues[varName] = originalValue;
              }
            }
          }
          return {
            ...ifStmt,
            condition: condition2,
            thenBranch,
            elseBranch,
          };
        }
        case "WhileStatement" /* WhileStatement */:
          const whileStmt = stmt;
          const modifiedVars = this.getModifiedVariables(whileStmt.body);
          const conditionVars = this.getVariablesInExpression(
            whileStmt.condition,
          );
          const savedConstants = {};
          for (const condVar of conditionVars) {
            if (modifiedVars.has(condVar)) {
              savedConstants[condVar] = this.constantValues[condVar];
              delete this.constantValues[condVar];
            }
          }
          const condition = this.cpExpression(whileStmt.condition);
          for (const modVar of modifiedVars) {
            if (this.canOptimizeVariable(modVar)) {
              delete this.constantValues[modVar];
            }
          }
          const body = this.cpStatement(whileStmt.body);
          return {
            ...whileStmt,
            condition,
            body,
          };
        case "ReturnStatement" /* ReturnStatement */:
          const returnStmt = stmt;
          return {
            ...returnStmt,
            argument: this.cpExpression(returnStmt.argument),
          };
        case "ExpressionStatement" /* ExpressionStatement */:
          const exprStmt = stmt;
          return {
            ...exprStmt,
            expression: this.cpExpression(exprStmt.expression),
          };
        case "BlockStatement" /* BlockStatement */:
          return this.cpBlock(stmt);
        default:
          return stmt;
      }
    }
    cpExpression(expr) {
      if (this.containsPointerOperations(expr)) {
        return expr;
      }
      switch (expr.type) {
        case "Identifier" /* Identifier */:
          const id = expr;
          if (
            this.constantValues.hasOwnProperty(id.name) &&
            this.constantValues[id.name] !== void 0 &&
            this.canOptimizeVariable(id.name)
          ) {
            this.currentPassStats.constantPropagation++;
            this.phaseChanged = true;
            return {
              type: "NumberLiteral" /* NumberLiteral */,
              value: this.constantValues[id.name],
            };
          }
          return expr;
        case "BinaryExpression" /* BinaryExpression */:
          const binExpr = expr;
          return {
            ...binExpr,
            left: this.cpExpression(binExpr.left),
            right: this.cpExpression(binExpr.right),
          };
        case "FunctionCall" /* FunctionCall */:
          const funcCall = expr;
          return {
            ...funcCall,
            arguments: funcCall.arguments.map((arg) => this.cpExpression(arg)),
          };
        default:
          return expr;
      }
    }
    runConstantFolding(program) {
      return {
        type: "Program" /* Program */,
        functions: program.functions.map((func) => this.cfFunction(func)),
      };
    }
    cfFunction(func) {
      return {
        ...func,
        body: this.cfBlock(func.body),
      };
    }
    cfBlock(block) {
      return {
        type: "BlockStatement" /* BlockStatement */,
        statements: block.statements.map((stmt) => this.cfStatement(stmt)),
      };
    }
    cfStatement(stmt) {
      if (this.statementInvolvesPointers(stmt)) {
        return stmt;
      }
      switch (stmt.type) {
        case "VariableDeclaration" /* VariableDeclaration */:
          const varDecl = stmt;
          return {
            ...varDecl,
            init: this.cfExpression(varDecl.init),
          };
        case "AssignmentStatement" /* AssignmentStatement */:
          const assignment = stmt;
          return {
            ...assignment,
            value: this.cfExpression(assignment.value),
          };
        case "IfStatement" /* IfStatement */:
          const ifStmt = stmt;
          const condition = this.cfExpression(ifStmt.condition);
          return {
            ...ifStmt,
            condition,
            thenBranch: this.cfStatement(ifStmt.thenBranch),
            elseBranch: ifStmt.elseBranch
              ? this.cfStatement(ifStmt.elseBranch)
              : null,
          };
        case "WhileStatement" /* WhileStatement */:
          const whileStmt = stmt;
          const modifiedVars = this.getModifiedVariables(whileStmt.body);
          const savedConstants = {};
          for (const modVar of modifiedVars) {
            if (this.canOptimizeVariable(modVar)) {
              savedConstants[modVar] = this.constantValues[modVar];
              delete this.constantValues[modVar];
            }
          }
          const whileCondition = this.cfExpression(whileStmt.condition);
          if (
            whileCondition.type === "NumberLiteral" /* NumberLiteral */ &&
            !this.containsPointerOperations(whileCondition)
          ) {
            const condValue = whileCondition.value;
            if (condValue === 0) {
              this.currentPassStats.deadCodeElimination++;
              this.phaseChanged = true;
              return {
                type: "BlockStatement" /* BlockStatement */,
                statements: [],
              };
            }
          }
          return {
            ...whileStmt,
            condition: whileCondition,
            body: this.cfStatement(whileStmt.body),
          };
        case "ReturnStatement" /* ReturnStatement */:
          const returnStmt = stmt;
          return {
            ...returnStmt,
            argument: this.cfExpression(returnStmt.argument),
          };
        case "ExpressionStatement" /* ExpressionStatement */:
          const exprStmt = stmt;
          return {
            ...exprStmt,
            expression: this.cfExpression(exprStmt.expression),
          };
        case "BlockStatement" /* BlockStatement */:
          return this.cfBlock(stmt);
        default:
          return stmt;
      }
    }
    cfExpression(expr) {
      if (this.containsPointerOperations(expr)) {
        return expr;
      }
      switch (expr.type) {
        case "BinaryExpression" /* BinaryExpression */:
          const binExpr = expr;
          const left = this.cfExpression(binExpr.left);
          const right = this.cfExpression(binExpr.right);
          const simplified = this.algebraicSimplify(
            binExpr.operator,
            left,
            right,
          );
          if (simplified) {
            return simplified;
          }
          if (
            left.type === "NumberLiteral" /* NumberLiteral */ &&
            right.type === "NumberLiteral" /* NumberLiteral */
          ) {
            const leftVal = left.value;
            const rightVal = right.value;
            let result;
            switch (binExpr.operator) {
              case "+":
                result = leftVal + rightVal;
                break;
              case "-":
                result = leftVal - rightVal;
                break;
              case "*":
                result = leftVal * rightVal;
                break;
              case "/":
                if (rightVal === 0) {
                  throw new Error("Division by zero");
                }
                result = Math.floor(leftVal / rightVal);
                break;
              case "<":
                result = leftVal < rightVal ? 1 : 0;
                break;
              case ">":
                result = leftVal > rightVal ? 1 : 0;
                break;
              case "==":
                result = leftVal === rightVal ? 1 : 0;
                break;
              default:
                return { ...binExpr, left, right };
            }
            this.currentPassStats.constantFolding++;
            this.phaseChanged = true;
            return { type: "NumberLiteral" /* NumberLiteral */, value: result };
          }
          return { ...binExpr, left, right };
        case "FunctionCall" /* FunctionCall */:
          const funcCall = expr;
          return {
            ...funcCall,
            arguments: funcCall.arguments.map((arg) => this.cfExpression(arg)),
          };
        default:
          return expr;
      }
    }
    algebraicSimplify(operator, left, right) {
      if (
        (operator === "+" || operator === "-") &&
        right.type === "NumberLiteral" /* NumberLiteral */ &&
        right.value === 0
      ) {
        this.currentPassStats.algebraicSimplification++;
        this.phaseChanged = true;
        return left;
      }
      if (
        operator === "+" &&
        left.type === "NumberLiteral" /* NumberLiteral */ &&
        left.value === 0
      ) {
        this.currentPassStats.algebraicSimplification++;
        this.phaseChanged = true;
        return right;
      }
      if (
        operator === "*" &&
        right.type === "NumberLiteral" /* NumberLiteral */ &&
        right.value === 1
      ) {
        this.currentPassStats.algebraicSimplification++;
        this.phaseChanged = true;
        return left;
      }
      if (
        operator === "*" &&
        left.type === "NumberLiteral" /* NumberLiteral */ &&
        left.value === 1
      ) {
        this.currentPassStats.algebraicSimplification++;
        this.phaseChanged = true;
        return right;
      }
      if (
        operator === "*" &&
        ((left.type === "NumberLiteral" /* NumberLiteral */ &&
          left.value === 0) ||
          (right.type === "NumberLiteral" /* NumberLiteral */ &&
            right.value === 0))
      ) {
        this.currentPassStats.algebraicSimplification++;
        this.phaseChanged = true;
        return { type: "NumberLiteral" /* NumberLiteral */, value: 0 };
      }
      if (
        operator === "/" &&
        right.type === "NumberLiteral" /* NumberLiteral */ &&
        right.value === 1
      ) {
        this.currentPassStats.algebraicSimplification++;
        this.phaseChanged = true;
        return left;
      }
      return null;
    }
    collectUsedVariables(program) {
      for (const func of program.functions) {
        this.collectUsedVariablesInFunction(func);
      }
    }
    collectUsedVariablesInFunction(func) {
      this.collectUsedVariablesInBlock(func.body);
    }
    collectUsedVariablesInBlock(block) {
      for (const stmt of block.statements) {
        this.collectUsedVariablesInStatement(stmt);
      }
    }
    collectUsedVariablesInStatement(stmt) {
      switch (stmt.type) {
        case "ExpressionStatement" /* ExpressionStatement */:
          this.collectUsedVariablesInExpression(stmt.expression);
          break;
        case "ReturnStatement" /* ReturnStatement */:
          this.collectUsedVariablesInExpression(stmt.argument);
          break;
        case "IfStatement" /* IfStatement */:
          const ifStmt = stmt;
          this.collectUsedVariablesInExpression(ifStmt.condition);
          this.collectUsedVariablesInStatement(ifStmt.thenBranch);
          if (ifStmt.elseBranch) {
            this.collectUsedVariablesInStatement(ifStmt.elseBranch);
          }
          break;
        case "WhileStatement" /* WhileStatement */:
          const whileStmt = stmt;
          this.collectUsedVariablesInExpression(whileStmt.condition);
          this.collectUsedVariablesInStatement(whileStmt.body);
          break;
        case "BlockStatement" /* BlockStatement */:
          this.collectUsedVariablesInBlock(stmt);
          break;
        case "AssignmentStatement" /* AssignmentStatement */:
          this.collectUsedVariablesInExpression(stmt.value);
          break;
        case "VariableDeclaration" /* VariableDeclaration */:
          this.collectUsedVariablesInExpression(stmt.init);
          break;
      }
    }
    collectUsedVariablesInExpression(expr) {
      switch (expr.type) {
        case "Identifier" /* Identifier */:
          this.usedVariables.add(expr.name);
          break;
        case "BinaryExpression" /* BinaryExpression */:
          const binExpr = expr;
          this.collectUsedVariablesInExpression(binExpr.left);
          this.collectUsedVariablesInExpression(binExpr.right);
          break;
        case "UnaryExpression" /* UnaryExpression */:
          const unaryExpr = expr;
          this.collectUsedVariablesInExpression(unaryExpr.operand);
          break;
        case "FunctionCall" /* FunctionCall */:
          const funcCall = expr;
          for (const arg of funcCall.arguments) {
            this.collectUsedVariablesInExpression(arg);
          }
          break;
      }
    }
    /* side effect analysis with interprocedural awareness */
    hasSideEffects(expr) {
      switch (expr.type) {
        case "FunctionCall" /* FunctionCall */:
          const funcCall = expr;
          const calledFunction = this.program.functions.find(
            (f) => f.name === funcCall.callee,
          );
          if (calledFunction) {
            if (this.isPureUserFunction(calledFunction)) {
              return false;
            }
          }
          if (["printf", "exit"].includes(funcCall.callee)) {
            return true;
          }
          return true;
        case "BinaryExpression" /* BinaryExpression */:
          const binExpr = expr;
          return (
            this.hasSideEffects(binExpr.left) ||
            this.hasSideEffects(binExpr.right)
          );
        case "UnaryExpression" /* UnaryExpression */:
          const unaryExpr = expr;
          return this.hasSideEffects(unaryExpr.operand);
        default:
          return false;
      }
    }
    /* heuristic approach, could be more more thorough */
    isPureUserFunction(func) {
      if (func.params.some((p) => p.paramType.includes("*"))) {
        return false;
      }
      if (func.returnType === "void") {
        return false;
      }
      return this.containsOnlyPureOperations(func.body);
    }
    containsOnlyPureOperations(stmt) {
      switch (stmt.type) {
        case "BlockStatement" /* BlockStatement */:
          const block = stmt;
          return block.statements.every((s) =>
            this.containsOnlyPureOperations(s),
          );
        case "ReturnStatement" /* ReturnStatement */:
          const returnStmt = stmt;
          return !this.hasSideEffects(returnStmt.argument);
        case "VariableDeclaration" /* VariableDeclaration */:
          const varDecl = stmt;
          return !this.hasSideEffects(varDecl.init);
        case "AssignmentStatement" /* AssignmentStatement */:
          const assignment = stmt;
          return (
            typeof assignment.target === "string" &&
            !this.hasSideEffects(assignment.value)
          );
        case "IfStatement" /* IfStatement */:
          const ifStmt = stmt;
          return (
            !this.hasSideEffects(ifStmt.condition) &&
            this.containsOnlyPureOperations(ifStmt.thenBranch) &&
            (!ifStmt.elseBranch ||
              this.containsOnlyPureOperations(ifStmt.elseBranch))
          );
        case "ExpressionStatement" /* ExpressionStatement */:
          return !this.hasSideEffects(stmt.expression);
        default:
          return false;
      }
    }
    getModifiedVariables(stmt) {
      const modified = /* @__PURE__ */ new Set();
      const traverse = (node) => {
        if (!node) return;
        switch (node.type) {
          case "AssignmentStatement" /* AssignmentStatement */:
            const assignment = node;
            if (typeof assignment.target === "string") {
              modified.add(assignment.target);
            }
            traverse(assignment.value);
            break;
          case "VariableDeclaration" /* VariableDeclaration */:
            const varDecl = node;
            modified.add(varDecl.name);
            traverse(varDecl.init);
            break;
          case "BlockStatement" /* BlockStatement */:
            const block = node;
            block.statements.forEach(traverse);
            break;
          case "IfStatement" /* IfStatement */:
            const ifStmt = node;
            traverse(ifStmt.condition);
            traverse(ifStmt.thenBranch);
            if (ifStmt.elseBranch) traverse(ifStmt.elseBranch);
            break;
          case "WhileStatement" /* WhileStatement */:
            const whileStmt = node;
            traverse(whileStmt.condition);
            traverse(whileStmt.body);
            break;
          case "ExpressionStatement" /* ExpressionStatement */:
            const exprStmt = node;
            traverse(exprStmt.expression);
            break;
          case "ReturnStatement" /* ReturnStatement */:
            const returnStmt = node;
            traverse(returnStmt.argument);
            break;
          case "BinaryExpression" /* BinaryExpression */:
            const binExpr = node;
            traverse(binExpr.left);
            traverse(binExpr.right);
            break;
          case "UnaryExpression" /* UnaryExpression */:
            const unaryExpr = node;
            traverse(unaryExpr.operand);
            break;
          case "FunctionCall" /* FunctionCall */:
            const funcCall = node;
            funcCall.arguments.forEach(traverse);
            break;
          default:
            break;
        }
      };
      traverse(stmt);
      return modified;
    }
    getVariablesInExpression(expr) {
      const variables = /* @__PURE__ */ new Set();
      const traverse = (node) => {
        if (!node) return;
        switch (node.type) {
          case "Identifier" /* Identifier */:
            const id = node;
            variables.add(id.name);
            break;
          case "BinaryExpression" /* BinaryExpression */:
            const binExpr = node;
            traverse(binExpr.left);
            traverse(binExpr.right);
            break;
          case "UnaryExpression" /* UnaryExpression */:
            const unaryExpr = node;
            traverse(unaryExpr.operand);
            break;
          case "FunctionCall" /* FunctionCall */:
            const funcCall = node;
            funcCall.arguments.forEach(traverse);
            break;
          default:
            break;
        }
      };
      traverse(expr);
      return variables;
    }
    deepClone(obj) {
      return JSON.parse(JSON.stringify(obj));
    }
  };

  // src/index.ts
  var Compiler = class {
    static tokenize(source) {
      return new Lexer().load(source).run();
    }
    static parse(tokens) {
      return new Parser().load(tokens).run();
    }
    static optimise(program) {
      return new Optimizer().load(program).run();
    }
    static generate(program) {
      return new ARM64CodeGenerator().load(program).run();
    }
    static interpret(asm) {
      const interpreter = new ARM64Interpreter().load(asm);
      const result = interpreter.run();
      if (result.error) {
        return result.error;
      }
      return result.output;
    }
    static compile(source, optimise = true) {
      const tokens = this.tokenize(source);
      const ast = this.parse(tokens);
      if (optimise) {
        return this.generate(this.optimise(ast).asm);
      }
      return this.generate(ast);
    }
  };
  return __toCommonJS(index_exports);
})();
