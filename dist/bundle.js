"use strict";
var MyLibrary = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    Compiler: () => Compiler
  });

  // src/Lexer.ts
  var Lexer = class {
    source;
    tokens = [];
    start = 0;
    current = 0;
    line = 1;
    constructor(source) {
      this.source = source;
    }
    scanTokens() {
      while (!this.isAtEnd()) {
        this.start = this.current;
        this.scanToken();
      }
      this.tokens.push({
        type: "EOF" /* EOF */,
        lexeme: "",
        line: this.line
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
            while (this.advance() != "\n") {
            }
            console.log("NEWLINE");
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
              `Unexpected character: '${c}' (code ${c.charCodeAt(0)}) at line ${this.line}`
            );
          }
          break;
      }
    }
    identifier() {
      while (this.isAlphaNumeric(this.peek())) this.advance();
      const text = this.source.substring(this.start, this.current);
      let type = "IDENTIFIER" /* IDENTIFIER */;
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
        parseInt(this.source.substring(this.start, this.current))
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
      return c >= "a" && c <= "z" || c >= "A" && c <= "Z" || c === "_";
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
        line: this.line
      });
    }
  };

  // src/parser.ts
  var Parser = class {
    tokens;
    current = 0;
    constructor(tokens) {
      this.tokens = tokens;
    }
    parse() {
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
        functions
      };
    }
    parseWhileStatement() {
      this.consume("LEFT_PAREN" /* LEFT_PAREN */, "Expect '(' after 'while'.");
      const condition = this.parseExpression();
      this.consume("RIGHT_PAREN" /* RIGHT_PAREN */, "Expect ')' after while condition.");
      const body = this.parseStatement();
      return {
        type: "WhileStatement" /* WhileStatement */,
        condition,
        body
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
        throw this.error(this.peek(), "Expect return type (int, int*, or void).");
      }
      const nameToken = this.consume(
        "IDENTIFIER" /* IDENTIFIER */,
        "Expect function name."
      );
      this.consume("LEFT_PAREN" /* LEFT_PAREN */, "Expect '(' after function name.");
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
            "Expect parameter name."
          );
          params.push({
            type: "Parameter" /* Parameter */,
            name: paramName.lexeme,
            paramType
          });
        } while (this.match("COMMA" /* COMMA */));
      }
      this.consume("RIGHT_PAREN" /* RIGHT_PAREN */, "Expect ')' after parameters.");
      this.consume("LEFT_BRACE" /* LEFT_BRACE */, "Expect '{' before function body.");
      const body = this.parseBlock();
      return {
        type: "FunctionDeclaration" /* FunctionDeclaration */,
        name: nameToken.lexeme,
        params,
        returnType,
        body
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
        statements
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
      if (this.check("IDENTIFIER" /* IDENTIFIER */) || this.check("MULTIPLY" /* MULTIPLY */)) {
        const checkpoint = this.current;
        try {
          let target;
          if (this.match("MULTIPLY" /* MULTIPLY */)) {
            const operand = this.parsePrimary();
            target = {
              type: "UnaryExpression" /* UnaryExpression */,
              operator: "*",
              operand
            };
          } else {
            const identifier = this.advance();
            target = identifier.lexeme;
          }
          if (this.match("EQUAL" /* EQUAL */)) {
            const value = this.parseExpression();
            this.consume("SEMICOLON" /* SEMICOLON */, "Expect ';' after assignment.");
            return {
              type: "AssignmentStatement" /* AssignmentStatement */,
              target,
              value
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
      this.consume("RIGHT_PAREN" /* RIGHT_PAREN */, "Expect ')' after if condition.");
      const thenBranch = this.parseStatement();
      let elseBranch = null;
      if (this.match("ELSE" /* ELSE */)) {
        elseBranch = this.parseStatement();
      }
      return {
        type: "IfStatement" /* IfStatement */,
        condition,
        thenBranch,
        elseBranch
      };
    }
    parseReturnStatement() {
      let expression = null;
      if (!this.check("SEMICOLON" /* SEMICOLON */)) {
        expression = this.parseExpression();
      } else {
        expression = { type: "VoidExpression" /* VoidExpression */ };
      }
      this.consume("SEMICOLON" /* SEMICOLON */, "Expect ';' after return statement.");
      return {
        type: "ReturnStatement" /* ReturnStatement */,
        argument: expression
      };
    }
    parseVariableDeclaration() {
      let varType = "int";
      if (this.match("MULTIPLY" /* MULTIPLY */)) {
        varType = "int*";
      }
      const name = this.consume(
        "IDENTIFIER" /* IDENTIFIER */,
        "Expect variable name."
      ).lexeme;
      this.consume("EQUAL" /* EQUAL */, "Expect '=' after variable name.");
      const initializer = this.parseExpression();
      this.consume("SEMICOLON" /* SEMICOLON */, "Expect ';' after variable declaration.");
      return {
        type: "VariableDeclaration" /* VariableDeclaration */,
        name,
        varType,
        init: initializer
      };
    }
    parseExpressionStatement() {
      const expr = this.parseExpression();
      this.consume("SEMICOLON" /* SEMICOLON */, "Expect ';' after expression.");
      return {
        type: "ExpressionStatement" /* ExpressionStatement */,
        expression: expr
      };
    }
    parseExpression() {
      return this.parseComparison();
    }
    parseComparison() {
      let expr = this.parseAdditive();
      if (this.match(
        "LESS_THAN" /* LESS_THAN */,
        "GREATER_THAN" /* GREATER_THAN */,
        "EQUAL_EQUAL" /* EQUAL_EQUAL */
      )) {
        const operator = this.previous().lexeme;
        const right = this.parseAdditive();
        expr = {
          type: "BinaryExpression" /* BinaryExpression */,
          operator,
          left: expr,
          right
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
          right
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
          right
        };
      }
      return expr;
    }
    // New: Parse unary expressions (address-of and dereference)
    parseUnary() {
      if (this.match("AMPERSAND" /* AMPERSAND */)) {
        const operator = this.previous().lexeme;
        const operand = this.parseUnary();
        return {
          type: "UnaryExpression" /* UnaryExpression */,
          operator,
          operand
        };
      }
      if (this.match("MULTIPLY" /* MULTIPLY */)) {
        const operator = this.previous().lexeme;
        const operand = this.parseUnary();
        return {
          type: "UnaryExpression" /* UnaryExpression */,
          operator,
          operand
        };
      }
      return this.parsePrimary();
    }
    parsePrimary() {
      if (this.match("NUMBER" /* NUMBER */)) {
        return {
          type: "NumberLiteral" /* NumberLiteral */,
          value: Number(this.previous().lexeme)
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
          this.consume("RIGHT_PAREN" /* RIGHT_PAREN */, "Expect ')' after arguments.");
          return {
            type: "FunctionCall" /* FunctionCall */,
            callee: name,
            arguments: args
          };
        }
        return {
          type: "Identifier" /* Identifier */,
          name
        };
      }
      if (this.match("LEFT_PAREN" /* LEFT_PAREN */)) {
        const expr = this.parseExpression();
        this.consume("RIGHT_PAREN" /* RIGHT_PAREN */, "Expect ')' after expression.");
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
      const errorMsg = token.type === "EOF" /* EOF */ ? `Error at end: ${message}` : `Error at token '${token.lexeme}' on line ${token.line}: ${message}`;
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
        if (returnStmt.argument.type === "VoidExpression" /* VoidExpression */) {
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
    availableRegs = [
      "x8",
      // Changed to 64-bit registers
      "x9",
      "x10",
      "x11",
      "x12",
      "x13",
      "x14",
      "x15"
    ];
    usedRegs = [];
    allocate() {
      if (this.availableRegs.length === 0) {
        throw new Error("No more registers available - expression too complex");
      }
      const reg = this.availableRegs.shift();
      this.usedRegs.push(reg);
      return reg;
    }
    release(reg) {
      const index = this.usedRegs.indexOf(reg);
      if (index !== -1) {
        this.usedRegs.splice(index, 1);
        this.availableRegs.unshift(reg);
      }
    }
    // Reset for each function
    reset() {
      this.availableRegs = ["x8", "x9", "x10", "x11", "x12", "x13", "x14", "x15"];
      this.usedRegs = [];
    }
    // Check if we have registers available
    hasAvailable() {
      return this.availableRegs.length > 0;
    }
  };
  var ARM64CodeGenerator = class {
    output = [];
    currentFunction = "";
    functionEndLabel = "";
    varLocationMap = /* @__PURE__ */ new Map();
    stringLiterals = /* @__PURE__ */ new Map();
    labelCounter = 0;
    stringLiteralCounter = 0;
    regAlloc = new RegisterAllocator();
    nextOffsetMap = /* @__PURE__ */ new Map();
    /**
     * because there's no way I'm writing a linker, we're going to
     * cheat by hard coding calls to external functions, in this case, printf.
     * anything more sophisticated is well beyond the scope
     */
    specialFunctions = {
      printf: (args) => {
        const formatString = "%ld\\n";
        const label = this.addStringLiteral(formatString);
        if (args[0].type === "UnaryExpression") {
          const unaryExpr = args[0];
          if (unaryExpr.operator === "&" && unaryExpr.operand.type === "Identifier") {
            const varName = unaryExpr.operand.name;
            const varLocation = this.getVarLocation(
              this.currentFunction,
              varName
            );
            if (varLocation) {
              const { frameRelative, offset } = varLocation;
              return [
                // Load the pointer value (address stored in the parameter)
                frameRelative ? `	ldr	x8, [x29, #${offset}]` : `	ldr	x8, [sp, #${offset}]`,
                // Dereference the pointer to get the actual value
                `	ldr	x0, [x8]`,
                // Load value from address in x8
                // Prepare for printf call
                "mov x9, sp",
                "mov x8, x0",
                "str x8, [x9]",
                `adrp x0, ${label}@PAGE`,
                `add x0, x0, ${label}@PAGEOFF`,
                "bl _printf"
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
          "bl _printf"
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
      }
    };
    generate(ast) {
      this.output = [];
      this.varLocationMap.clear();
      this.stringLiterals.clear();
      this.labelCounter = 0;
      this.stringLiteralCounter = 0;
      this.nextOffsetMap.clear();
      this.addLine("	.section	__TEXT,__text,regular,pure_instructions");
      this.addLine("	.build_version macos, 15, 0	sdk_version 15, 4");
      for (const func of ast.functions) {
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
        const varLocation = this.getVarLocation(
          this.currentFunction,
          stmt.target
        );
        if (!varLocation) {
          throw new Error(
            `Variable not found: ${stmt.target} in function ${this.currentFunction}`
          );
        }
        const { frameRelative, offset } = varLocation;
        if (frameRelative) {
          this.addLine(`	str	x0, [x29, #${offset}]`);
        } else {
          this.addLine(`	str	x0, [sp, #${offset}]`);
        }
      } else if (stmt.target.type === "UnaryExpression" && stmt.target.operator === "*") {
        this.addLine(`	mov	x8, x0`);
        const ptrCode = this.generateExpression(stmt.target.operand);
        this.addLines(ptrCode);
        this.addLine(`	str	x8, [x0]`);
      } else {
        throw new Error("Invalid assignment target");
      }
    }
    calculateStackSizeForFunction(func) {
      const baseStackSize = 32;
      const parameterSpace = Math.max(
        32,
        Math.ceil(func.params.length * 8 / 8) * 8
        // Changed to 8 bytes per param
      );
      const localVarSpace = 64;
      const tempSpace = 32;
      const total = baseStackSize + parameterSpace + localVarSpace + tempSpace;
      return Math.ceil(total / 16) * 16;
    }
    generateFunction(func) {
      this.currentFunction = func.name;
      this.varLocationMap.set(func.name, /* @__PURE__ */ new Map());
      this.functionEndLabel = this.generateLabel("function_end");
      this.regAlloc.reset();
      const isMain = func.name === "main";
      this.nextOffsetMap.set(func.name, isMain ? -8 : 16);
      this.addLine("");
      this.addLine(
        `	.globl	_${func.name}					 ; -- Begin function ${func.name}`
      );
      this.addLine("	.p2align	2");
      this.addLine(`_${func.name}:						 ; @${func.name}`);
      if (isMain) {
        this.addLine("	sub	sp, sp, #48");
        this.addLine("	stp	x29, x30, [sp, #32]			 ; 16-byte Folded Spill");
        this.addLine("	add	x29, sp, #32");
        this.generateBlock(func.body);
        this.addLine(`${this.functionEndLabel}:`);
        this.addLine("	ldp	x29, x30, [sp, #32]			 ; 16-byte Folded Reload");
        this.addLine("	add	sp, sp, #48");
      } else {
        const totalStackSize = this.calculateStackSizeForFunction(func);
        this.addLine(`	sub	sp, sp, #${totalStackSize}`);
        this.addLine(`	stp	x29, x30, [sp, #${totalStackSize - 16}]`);
        this.addLine(`	add	x29, sp, #${totalStackSize - 16}`);
        for (let i = 0; i < func.params.length; i++) {
          const param = func.params[i];
          const offset = this.allocateStackSlot(func.name, false);
          this.setVarLocation(func.name, param.name, false, offset);
          if (i < 8) {
            this.addLine(`	str	x${i}, [sp, #${offset}]`);
          } else {
            throw new Error(
              `Function ${func.name} has more than 8 parameters, which is not supported`
            );
          }
        }
        this.generateBlock(func.body);
        this.addLine(`${this.functionEndLabel}:`);
        this.addLine(`	ldp	x29, x30, [sp, #${totalStackSize - 16}]`);
        this.addLine(`	add	sp, sp, #${totalStackSize}`);
      }
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
    generateStatement(stmt) {
      switch (stmt.type) {
        case "ReturnStatement":
          this.generateReturnStatement(stmt);
          break;
        case "BlockStatement":
          this.generateBlock(stmt);
          break;
        case "VariableDeclaration":
          const isMain = this.currentFunction === "main";
          if (isMain) {
            const offset = this.allocateStackSlot(this.currentFunction, true);
            this.setVarLocation(this.currentFunction, stmt.name, true, offset);
            if (stmt.init.type === "NumberLiteral") {
              this.addLine(
                `	mov	x8, #${stmt.init.value}				; =0x${stmt.init.value.toString(16)}`
                // Changed to x8
              );
              this.addLine(`	str	x8, [x29, #${offset}]`);
            } else {
              const initCode = this.generateExpression(stmt.init);
              this.addLines(initCode);
              this.addLine(`	str	x0, [x29, #${offset}]`);
            }
          } else {
            const offset = this.allocateStackSlot(this.currentFunction, false);
            this.setVarLocation(this.currentFunction, stmt.name, false, offset);
            if (stmt.init.type === "NumberLiteral") {
              this.addLine(
                `	mov	x8, #${stmt.init.value}				; =0x${stmt.init.value.toString(16)}`
                // Changed to x8
              );
              this.addLine(`	str	x8, [sp, #${offset}]`);
            } else {
              const initCode = this.generateExpression(stmt.init);
              this.addLines(initCode);
              this.addLine(`	str	x0, [sp, #${offset}]`);
            }
          }
          break;
        case "ExpressionStatement":
          const exprCode = this.generateExpression(stmt.expression);
          this.addLines(exprCode);
          break;
        case "AssignmentStatement":
          this.generateAssignmentStatement(stmt);
          break;
        case "IfStatement":
          this.generateIfStatement(stmt);
          break;
        case "WhileStatement":
          this.generateWhileStatement(stmt);
          break;
      }
    }
    allocateStackSlot(funcName, frameRelative) {
      const currentOffset = this.nextOffsetMap.get(funcName);
      if (frameRelative) {
        this.nextOffsetMap.set(funcName, currentOffset - 8);
      } else {
        this.nextOffsetMap.set(funcName, currentOffset + 8);
      }
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
      if (stmt.body.type === "BlockStatement") {
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
      if (stmt.thenBranch.type === "BlockStatement") {
        this.generateBlock(stmt.thenBranch);
      } else {
        this.generateStatement(stmt.thenBranch);
      }
      if (stmt.elseBranch) {
        this.addLine(`	b	${endLabel}`);
        this.addLine(`${elseLabel}:`);
        if (stmt.elseBranch.type === "BlockStatement") {
          this.generateBlock(stmt.elseBranch);
        } else {
          this.generateStatement(stmt.elseBranch);
        }
      }
      this.addLine(`${endLabel}:`);
    }
    generateExpression(expr) {
      switch (expr.type) {
        case "BinaryExpression":
          return this.generateBinaryExpression(expr);
        case "UnaryExpression":
          return this.generateUnaryExpression(expr);
        case "FunctionCall":
          return this.generateFunctionCall(expr);
        case "Identifier":
          return this.generateIdentifier(expr);
        case "NumberLiteral":
          return this.generateNumberLiteral(expr);
        case "VoidExpression":
          return [];
        default:
          return [];
      }
    }
    // NEW: Generate unary expressions (address-of and dereference)
    generateUnaryExpression(expr) {
      const result = [];
      switch (expr.operator) {
        case "&":
          if (expr.operand.type === "Identifier") {
            const varLocation = this.getVarLocation(
              this.currentFunction,
              expr.operand.name
            );
            if (!varLocation) {
              throw new Error(`Variable not found: ${expr.operand.name}`);
            }
            const { frameRelative, offset } = varLocation;
            if (frameRelative) {
              result.push(`	add	x0, x29, #${offset}`);
            } else {
              result.push(`	add	x0, sp, #${offset}`);
            }
          } else {
            throw new Error(
              "Address-of operator can only be applied to variables"
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
    // Fallback method for very complex expressions
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
        throw new Error(
          "More than 8 function arguments not supported in this educational compiler"
        );
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
        const tempOffset = this.allocateStackSlot(this.currentFunction, false);
        tempStackOffsets.push(tempOffset);
        if (this.currentFunction === "main") {
          result.push(`	str	x0, [x29, #${tempOffset}]`);
        } else {
          result.push(`	str	x0, [sp, #${tempOffset}]`);
        }
      }
      for (let i = 0; i < expr.arguments.length; i++) {
        const tempOffset = tempStackOffsets[i];
        if (this.currentFunction === "main") {
          result.push(`	ldr	x${i}, [x29, #${tempOffset}]`);
        } else {
          result.push(`	ldr	x${i}, [sp, #${tempOffset}]`);
        }
      }
      result.push(`	bl	_${expr.callee}`);
      return result;
    }
    generateIdentifier(expr) {
      const varLocation = this.getVarLocation(this.currentFunction, expr.name);
      if (!varLocation) {
        throw new Error(
          `Variable not found: ${expr.name} in function ${this.currentFunction}`
        );
      }
      const { frameRelative, offset } = varLocation;
      if (frameRelative) {
        return [`	ldr	x0, [x29, #${offset}]`];
      } else {
        return [`	ldr	x0, [sp, #${offset}]`];
      }
    }
    generateNumberLiteral(expr) {
      return [`	mov	x0, #${expr.value}				; =0x${expr.value.toString(16)}`];
    }
    /* needs to be unique */
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
    setVarLocation(funcName, varName, frameRelative, offset) {
      let varMap = this.varLocationMap.get(funcName);
      if (!varMap) {
        varMap = /* @__PURE__ */ new Map();
        this.varLocationMap.set(funcName, varMap);
      }
      varMap.set(varName, { frameRelative, offset });
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

  // src/optimiser.ts
  var IterativeOptimizer = class {
    stats;
    constantValues;
    usedVariables;
    currentPassStats;
    currentPhase;
    phaseChanged = false;
    // Pointer-related tracking
    hasPointers = false;
    pointerVariables;
    // Variables that are pointers
    pointerReferencedVariables;
    // Variables that have their address taken
    constructor() {
      this.resetStats();
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
        pointersDetected: 0
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
        algebraicSimplification: 0
      };
    }
    functionQueue = [];
    _program;
    functionPass = false;
    optimize(program, maxPasses = 10) {
      this.resetStats();
      let currentProgram = this.deepClone(program);
      this._program = currentProgram;
      console.log("\n=== Pointer Detection Phase ===");
      this.detectPointers(currentProgram);
      if (this.hasPointers) {
        console.log(
          `Pointers detected! Found pointer variables: ${Array.from(this.pointerVariables).join(", ")}`
        );
        console.log(
          `Variables with address taken: ${Array.from(this.pointerReferencedVariables).join(", ")}`
        );
        console.log("Optimization will be DISABLED for pointer-related code");
        this.stats.pointersDetected = this.pointerVariables.size + this.pointerReferencedVariables.size;
      } else {
        console.log("No pointers detected, full optimization enabled");
      }
      let passChanged = true;
      while (passChanged && this.stats.passes < maxPasses) {
        this.stats.passes++;
        this.resetPassStats();
        console.log(`
=== Pass ${this.stats.passes} ===`);
        passChanged = false;
        this.currentPhase = "Dead Code Elimination" /* DeadCodeElimination */;
        this.phaseChanged = false;
        console.log(`
Pass ${this.stats.passes}: ${this.currentPhase}`);
        this.constantValues = {};
        this.usedVariables = /* @__PURE__ */ new Set();
        this.collectUsedVariables(currentProgram);
        currentProgram = this.runDeadCodeElimination(currentProgram);
        if (this.phaseChanged) {
          passChanged = true;
          console.log(
            `  DCE: ${this.currentPassStats.deadCodeElimination} eliminations`
          );
        }
        this.currentPhase = "Constant Propagation" /* ConstantPropagation */;
        this.phaseChanged = false;
        console.log(`
Pass ${this.stats.passes}: ${this.currentPhase}`);
        this.constantValues = {};
        currentProgram = this.runConstantPropagation(currentProgram);
        if (this.phaseChanged) {
          passChanged = true;
          console.log(
            `  CP: ${this.currentPassStats.constantPropagation} propagations`
          );
        }
        this.currentPhase = "Constant Folding" /* ConstantFolding */;
        this.phaseChanged = false;
        console.log(`
Pass ${this.stats.passes}: ${this.currentPhase}`);
        currentProgram = this.runConstantFolding(currentProgram);
        if (this.phaseChanged) {
          passChanged = true;
          console.log(`  CF: ${this.currentPassStats.constantFolding} foldings`);
          console.log(
            `  AS: ${this.currentPassStats.algebraicSimplification} simplifications`
          );
        }
        this.stats.constantFolding += this.currentPassStats.constantFolding;
        this.stats.constantPropagation += this.currentPassStats.constantPropagation;
        this.stats.deadCodeElimination += this.currentPassStats.deadCodeElimination;
        this.stats.algebraicSimplification += this.currentPassStats.algebraicSimplification;
      }
      this.stats.totalOptimizations = this.stats.constantFolding + this.stats.constantPropagation + this.stats.deadCodeElimination + this.stats.algebraicSimplification;
      console.log(`
Optimization completed after ${this.stats.passes} passes`);
      console.log("\n=== Dead Function Elimination ===");
      if (currentProgram.functions.length === 0) {
        throw new Error("Program needs at least one function");
      }
      const mainFunction = currentProgram.functions.find(
        (f) => f.name === "main"
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
        console.log(`Processing function: ${currentFunction.name}`);
        this.functionPass = true;
        this.findFunctionCalls(currentFunction).forEach((funcName) => {
          const calledFunc = currentProgram.functions.find(
            (f) => f.name === funcName
          );
          if (calledFunc && !calledFunctions.has(funcName)) {
            functionQueue.push(calledFunc);
          }
        });
      }
      const originalFunctionCount = currentProgram.functions.length;
      const removedFunctions = currentProgram.functions.filter((f) => !calledFunctions.has(f.name)).map((f) => f.name);
      if (removedFunctions.length > 0) {
        console.log(`Removing unused functions: ${removedFunctions.join(", ")}`);
      }
      currentProgram.functions = currentProgram.functions.filter(
        (f) => calledFunctions.has(f.name)
      );
      this.stats.functionsRemoved = originalFunctionCount - calledFunctions.size;
      console.log(`Functions kept: ${Array.from(calledFunctions).join(", ")}`);
      console.log(`Functions removed: ${this.stats.functionsRemoved}`);
      return { optimized: currentProgram, stats: { ...this.stats } };
    }
    // =================== POINTER DETECTION ===================
    /**
     * Detects all pointer usage in the program and marks relevant variables
     */
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
        console.log(
          `  Function ${func.name} returns pointer type: ${func.returnType}`
        );
      }
      for (const param of func.params) {
        if (param.paramType.includes("*")) {
          this.hasPointers = true;
          this.pointerVariables.add(param.name);
          console.log(
            `  Parameter ${param.name} is pointer type: ${param.paramType}`
          );
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
            console.log(
              `  Variable ${varDecl.name} is pointer type: ${varDecl.varType}`
            );
          }
          this.detectPointersInExpression(varDecl.init);
          break;
        case "AssignmentStatement" /* AssignmentStatement */:
          const assignment = stmt;
          if (typeof assignment.target !== "string") {
            this.hasPointers = true;
            console.log(
              `  Found dereferenced pointer assignment: *${assignment.target.operand}`
            );
          }
          this.detectPointersInExpression(assignment.value);
          break;
        case "ExpressionStatement" /* ExpressionStatement */:
          this.detectPointersInExpression(
            stmt.expression
          );
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
              console.log(`  Address taken of variable: ${varName}`);
            }
          } else if (unaryExpr.operator === "*") {
            console.log(`  Found pointer dereference operation`);
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
        // Identifier and NumberLiteral don't need special handling
        default:
          break;
      }
    }
    // =================== POINTER-SAFE OPTIMIZATION CHECKS ===================
    /**
     * Determines if a variable can be safely optimized (not a pointer and address not taken)
     */
    canOptimizeVariable(varName) {
      if (!this.hasPointers) return true;
      const isPointer = this.pointerVariables.has(varName);
      const hasAddressTaken = this.pointerReferencedVariables.has(varName);
      if (isPointer || hasAddressTaken) {
        console.log(
          `  Skipping optimization of variable '${varName}' (${isPointer ? "is pointer" : "address taken"})`
        );
        return false;
      }
      return true;
    }
    /**
     * Determines if an expression contains any pointer operations
     */
    containsPointerOperations(expr) {
      switch (expr.type) {
        case "UnaryExpression" /* UnaryExpression */:
          const unaryExpr = expr;
          return unaryExpr.operator === "&" || unaryExpr.operator === "*";
        case "BinaryExpression" /* BinaryExpression */:
          const binExpr = expr;
          return this.containsPointerOperations(binExpr.left) || this.containsPointerOperations(binExpr.right);
        case "FunctionCall" /* FunctionCall */:
          const funcCall = expr;
          return funcCall.arguments.some(
            (arg) => this.containsPointerOperations(arg)
          );
        case "Identifier" /* Identifier */:
          const id = expr;
          return this.pointerVariables.has(id.name);
        default:
          return false;
      }
    }
    /**
     * Determines if a statement involves pointers and should be excluded from optimization
     */
    statementInvolvesPointers(stmt) {
      switch (stmt.type) {
        case "VariableDeclaration" /* VariableDeclaration */:
          const varDecl = stmt;
          return varDecl.varType.includes("*") || this.containsPointerOperations(varDecl.init);
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
          return this.containsPointerOperations(
            stmt.expression
          );
        case "ReturnStatement" /* ReturnStatement */:
          return this.containsPointerOperations(
            stmt.argument
          );
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
    // =================== MODIFIED OPTIMIZATION PHASES ===================
    // Helper method to find function calls within a function
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
    // Dead Code Elimination Phase
    runDeadCodeElimination(program) {
      return {
        type: "Program" /* Program */,
        functions: program.functions.map((func) => this.dceFunction(func))
      };
    }
    dceFunction(func) {
      return {
        ...func,
        body: this.dceBlock(func.body)
      };
    }
    dceBlock(block) {
      const statements = [];
      let foundReturn = false;
      for (const stmt of block.statements) {
        if (foundReturn) {
          this.currentPassStats.deadCodeElimination++;
          this.phaseChanged = true;
          console.log(`  DCE: Removed unreachable statement after return`);
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
        statements
      };
    }
    dceStatement(stmt) {
      if (this.statementInvolvesPointers(stmt)) {
        console.log(`  DCE: Skipping pointer-related statement`);
        return stmt;
      }
      switch (stmt.type) {
        case "VariableDeclaration" /* VariableDeclaration */:
          const varDecl = stmt;
          if (!this.usedVariables.has(varDecl.name) && !this.hasSideEffects(varDecl.init) && this.canOptimizeVariable(varDecl.name)) {
            this.currentPassStats.deadCodeElimination++;
            this.phaseChanged = true;
            console.log(`  DCE: Removed unused variable '${varDecl.name}'`);
            return null;
          }
          return stmt;
        case "AssignmentStatement" /* AssignmentStatement */:
          const assignment = stmt;
          if (typeof assignment.target === "string" && !this.usedVariables.has(assignment.target) && !this.hasSideEffects(assignment.value) && this.canOptimizeVariable(assignment.target)) {
            this.currentPassStats.deadCodeElimination++;
            this.phaseChanged = true;
            console.log(
              `  DCE: Removed assignment to unused variable '${assignment.target}'`
            );
            return null;
          }
          return stmt;
        case "IfStatement" /* IfStatement */:
          const ifStmt = stmt;
          const condition = ifStmt.condition;
          if (condition.type === "NumberLiteral" /* NumberLiteral */ && !this.containsPointerOperations(condition)) {
            const condValue = condition.value;
            this.currentPassStats.deadCodeElimination++;
            this.phaseChanged = true;
            if (condValue !== 0) {
              console.log(`  DCE: Removed else branch (condition always true)`);
              return this.cfStatement(ifStmt.thenBranch);
            } else {
              console.log(`  DCE: Removed then branch (condition always false)`);
              return ifStmt.elseBranch ? this.cfStatement(ifStmt.elseBranch) : { type: "BlockStatement" /* BlockStatement */, statements: [] };
            }
          }
          const thenBranch = this.dceStatement(ifStmt.thenBranch);
          const elseBranch = ifStmt.elseBranch ? this.dceStatement(ifStmt.elseBranch) : null;
          if (!thenBranch && !elseBranch) {
            return null;
          }
          return {
            ...ifStmt,
            thenBranch: thenBranch || {
              type: "BlockStatement" /* BlockStatement */,
              statements: []
            },
            elseBranch
          };
        case "WhileStatement" /* WhileStatement */:
          const whileStmt = stmt;
          const body = this.dceStatement(whileStmt.body);
          if (!body) {
            return null;
          }
          return {
            ...whileStmt,
            body
          };
        case "BlockStatement" /* BlockStatement */:
          return this.dceBlock(stmt);
        case "ExpressionStatement" /* ExpressionStatement */:
          const exprStmt = stmt;
          if (!this.hasSideEffects(exprStmt.expression)) {
            this.currentPassStats.deadCodeElimination++;
            this.phaseChanged = true;
            console.log(`  DCE: Removed side-effect-free expression statement`);
            return null;
          }
          return stmt;
        default:
          return stmt;
      }
    }
    // Constant Propagation Phase
    runConstantPropagation(program) {
      return {
        type: "Program" /* Program */,
        functions: program.functions.map((func) => this.cpFunction(func))
      };
    }
    cpFunction(func) {
      this.constantValues = {};
      return {
        ...func,
        body: this.cpBlock(func.body)
      };
    }
    cpBlock(block) {
      return {
        type: "BlockStatement" /* BlockStatement */,
        statements: block.statements.map((stmt) => this.cpStatement(stmt))
      };
    }
    cpStatement(stmt) {
      if (this.statementInvolvesPointers(stmt)) {
        console.log(`  CP: Skipping pointer-related statement`);
        return stmt;
      }
      switch (stmt.type) {
        case "VariableDeclaration" /* VariableDeclaration */: {
          const varDecl = stmt;
          const init = this.cpExpression(varDecl.init);
          if (init.type === "NumberLiteral" /* NumberLiteral */ && this.canOptimizeVariable(varDecl.name)) {
            this.constantValues[varDecl.name] = init.value;
          }
          return {
            ...varDecl,
            init
          };
        }
        case "AssignmentStatement" /* AssignmentStatement */:
          const assignment = stmt;
          const value = this.cpExpression(assignment.value);
          if (typeof assignment.target === "string" && this.canOptimizeVariable(assignment.target)) {
            if (value.type === "NumberLiteral" /* NumberLiteral */) {
              this.constantValues[assignment.target] = value.value;
            } else {
              delete this.constantValues[assignment.target];
            }
          }
          return {
            ...assignment,
            value
          };
        case "IfStatement" /* IfStatement */: {
          const ifStmt = stmt;
          const condition2 = this.cpExpression(ifStmt.condition);
          if (condition2.type === "NumberLiteral" /* NumberLiteral */) {
            const condValue = condition2.value;
            this.currentPassStats.constantPropagation++;
            this.phaseChanged = true;
            if (condValue !== 0) {
              console.log(
                `  CP: Condition always true, processing only then branch`
              );
              return this.cpStatement(ifStmt.thenBranch);
            } else {
              console.log(
                `  CP: Condition always false, processing only else branch`
              );
              return ifStmt.elseBranch ? this.cpStatement(ifStmt.elseBranch) : { type: "BlockStatement" /* BlockStatement */, statements: [] };
            }
          }
          const savedConstants2 = { ...this.constantValues };
          const thenBranch = this.cpStatement(ifStmt.thenBranch);
          const thenConstants = { ...this.constantValues };
          this.constantValues = { ...savedConstants2 };
          const elseBranch = ifStmt.elseBranch ? this.cpStatement(ifStmt.elseBranch) : null;
          const elseConstants = { ...this.constantValues };
          this.constantValues = {};
          for (const varName in savedConstants2) {
            const originalValue = savedConstants2[varName];
            const thenValue = thenConstants[varName];
            const elseValue = elseConstants[varName];
            if (thenValue !== void 0 && elseValue !== void 0 && thenValue === elseValue) {
              this.constantValues[varName] = thenValue;
            } else if (!ifStmt.elseBranch && thenValue !== void 0 && thenValue === originalValue) {
              this.constantValues[varName] = originalValue;
            } else if (!ifStmt.elseBranch && originalValue !== void 0) {
              if (!(varName in thenConstants) || thenConstants[varName] === originalValue) {
                this.constantValues[varName] = originalValue;
              }
            }
          }
          return {
            ...ifStmt,
            condition: condition2,
            thenBranch,
            elseBranch
          };
        }
        case "WhileStatement" /* WhileStatement */:
          const whileStmt = stmt;
          const modifiedVars = this.getModifiedVariables(whileStmt.body);
          const conditionVars = this.getVariablesInExpression(
            whileStmt.condition
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
            body
          };
        case "ReturnStatement" /* ReturnStatement */:
          const returnStmt = stmt;
          return {
            ...returnStmt,
            argument: this.cpExpression(returnStmt.argument)
          };
        case "ExpressionStatement" /* ExpressionStatement */:
          const exprStmt = stmt;
          return {
            ...exprStmt,
            expression: this.cpExpression(exprStmt.expression)
          };
        case "BlockStatement" /* BlockStatement */:
          return this.cpBlock(stmt);
        default:
          return stmt;
      }
    }
    cpExpression(expr) {
      if (this.containsPointerOperations(expr)) {
        console.log(`  CP: Skipping pointer-related expression`);
        return expr;
      }
      switch (expr.type) {
        case "Identifier" /* Identifier */:
          const id = expr;
          if (this.constantValues.hasOwnProperty(id.name) && this.constantValues[id.name] !== void 0 && this.canOptimizeVariable(id.name)) {
            this.currentPassStats.constantPropagation++;
            this.phaseChanged = true;
            console.log(
              `  CP: Replaced '${id.name}' with ${this.constantValues[id.name]}`
            );
            return {
              type: "NumberLiteral" /* NumberLiteral */,
              value: this.constantValues[id.name]
            };
          }
          return expr;
        case "BinaryExpression" /* BinaryExpression */:
          const binExpr = expr;
          return {
            ...binExpr,
            left: this.cpExpression(binExpr.left),
            right: this.cpExpression(binExpr.right)
          };
        case "FunctionCall" /* FunctionCall */:
          const funcCall = expr;
          if (this.functionPass) {
            this.functionQueue.push(
              this._program.functions.find((f) => f.name === funcCall.callee)
            );
          }
          return {
            ...funcCall,
            arguments: funcCall.arguments.map((arg) => this.cpExpression(arg))
          };
        default:
          return expr;
      }
    }
    // Constant Folding & Algebraic Simplification Phase
    runConstantFolding(program) {
      return {
        type: "Program" /* Program */,
        functions: program.functions.map((func) => this.cfFunction(func))
      };
    }
    cfFunction(func) {
      return {
        ...func,
        body: this.cfBlock(func.body)
      };
    }
    cfBlock(block) {
      return {
        type: "BlockStatement" /* BlockStatement */,
        statements: block.statements.map((stmt) => this.cfStatement(stmt))
      };
    }
    cfStatement(stmt) {
      if (this.statementInvolvesPointers(stmt)) {
        console.log(`  CF: Skipping pointer-related statement`);
        return stmt;
      }
      switch (stmt.type) {
        case "VariableDeclaration" /* VariableDeclaration */:
          const varDecl = stmt;
          return {
            ...varDecl,
            init: this.cfExpression(varDecl.init)
          };
        case "AssignmentStatement" /* AssignmentStatement */:
          const assignment = stmt;
          return {
            ...assignment,
            value: this.cfExpression(assignment.value)
          };
        case "IfStatement" /* IfStatement */:
          const ifStmt = stmt;
          const condition = this.cfExpression(ifStmt.condition);
          return {
            ...ifStmt,
            condition,
            thenBranch: this.cfStatement(ifStmt.thenBranch),
            elseBranch: ifStmt.elseBranch ? this.cfStatement(ifStmt.elseBranch) : null
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
          if (whileCondition.type === "NumberLiteral" /* NumberLiteral */ && !this.containsPointerOperations(whileCondition)) {
            const condValue = whileCondition.value;
            if (condValue === 0) {
              this.currentPassStats.deadCodeElimination++;
              this.phaseChanged = true;
              console.log(`  DCE: Removed while loop (condition always false)`);
              return { type: "BlockStatement" /* BlockStatement */, statements: [] };
            }
          }
          return {
            ...whileStmt,
            condition: whileCondition,
            body: this.cfStatement(whileStmt.body)
          };
        case "ReturnStatement" /* ReturnStatement */:
          const returnStmt = stmt;
          return {
            ...returnStmt,
            argument: this.cfExpression(returnStmt.argument)
          };
        case "ExpressionStatement" /* ExpressionStatement */:
          const exprStmt = stmt;
          return {
            ...exprStmt,
            expression: this.cfExpression(exprStmt.expression)
          };
        case "BlockStatement" /* BlockStatement */:
          return this.cfBlock(stmt);
        default:
          return stmt;
      }
    }
    cfExpression(expr) {
      if (this.containsPointerOperations(expr)) {
        console.log(`  CF: Skipping pointer-related expression`);
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
            right
          );
          if (simplified) {
            return simplified;
          }
          if (left.type === "NumberLiteral" /* NumberLiteral */ && right.type === "NumberLiteral" /* NumberLiteral */) {
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
            console.log(
              `  CF: Folded ${leftVal} ${binExpr.operator} ${rightVal} = ${result}`
            );
            return { type: "NumberLiteral" /* NumberLiteral */, value: result };
          }
          return { ...binExpr, left, right };
        case "FunctionCall" /* FunctionCall */:
          const funcCall = expr;
          if (this.functionPass) {
            this.functionQueue.push(
              this._program.functions.find((f) => f.name === funcCall.callee)
            );
          }
          return {
            ...funcCall,
            arguments: funcCall.arguments.map((arg) => this.cfExpression(arg))
          };
        default:
          return expr;
      }
    }
    algebraicSimplify(operator, left, right) {
      if ((operator === "+" || operator === "-") && right.type === "NumberLiteral" /* NumberLiteral */ && right.value === 0) {
        this.currentPassStats.algebraicSimplification++;
        this.phaseChanged = true;
        console.log(`  AS: Simplified ${operator} 0`);
        return left;
      }
      if (operator === "+" && left.type === "NumberLiteral" /* NumberLiteral */ && left.value === 0) {
        this.currentPassStats.algebraicSimplification++;
        this.phaseChanged = true;
        console.log(`  AS: Simplified 0 +`);
        return right;
      }
      if (operator === "*" && right.type === "NumberLiteral" /* NumberLiteral */ && right.value === 1) {
        this.currentPassStats.algebraicSimplification++;
        this.phaseChanged = true;
        console.log(`  AS: Simplified * 1`);
        return left;
      }
      if (operator === "*" && left.type === "NumberLiteral" /* NumberLiteral */ && left.value === 1) {
        this.currentPassStats.algebraicSimplification++;
        this.phaseChanged = true;
        console.log(`  AS: Simplified 1 *`);
        return right;
      }
      if (operator === "*" && (left.type === "NumberLiteral" /* NumberLiteral */ && left.value === 0 || right.type === "NumberLiteral" /* NumberLiteral */ && right.value === 0)) {
        this.currentPassStats.algebraicSimplification++;
        this.phaseChanged = true;
        console.log(`  AS: Simplified * 0`);
        return { type: "NumberLiteral" /* NumberLiteral */, value: 0 };
      }
      if (operator === "/" && right.type === "NumberLiteral" /* NumberLiteral */ && right.value === 1) {
        this.currentPassStats.algebraicSimplification++;
        this.phaseChanged = true;
        console.log(`  AS: Simplified / 1`);
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
          this.collectUsedVariablesInExpression(
            stmt.expression
          );
          break;
        case "ReturnStatement" /* ReturnStatement */:
          this.collectUsedVariablesInExpression(
            stmt.argument
          );
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
          this.collectUsedVariablesInExpression(
            stmt.value
          );
          break;
        case "VariableDeclaration" /* VariableDeclaration */:
          this.collectUsedVariablesInExpression(
            stmt.init
          );
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
          if (this.functionPass) {
            this.functionQueue.push(
              this._program.functions.find((f) => f.name === funcCall.callee)
            );
          }
          for (const arg of funcCall.arguments) {
            this.collectUsedVariablesInExpression(arg);
          }
          break;
      }
    }
    hasSideEffects(expr) {
      switch (expr.type) {
        case "FunctionCall" /* FunctionCall */:
          return true;
        // Assume all function calls have side effects
        case "BinaryExpression" /* BinaryExpression */:
          const binExpr = expr;
          return this.hasSideEffects(binExpr.left) || this.hasSideEffects(binExpr.right);
        case "UnaryExpression" /* UnaryExpression */:
          const unaryExpr = expr;
          return this.hasSideEffects(unaryExpr.operand);
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
    compile(source, optimise = true) {
      const tokens = new Lexer(source).scanTokens();
      const ast = new Parser(tokens).parse();
      const generator = new ARM64CodeGenerator();
      const asm = optimise ? generator.generate(new IterativeOptimizer().optimize(ast).optimized) : generator.generate(ast);
      return asm;
    }
  };
  return __toCommonJS(index_exports);
})();
