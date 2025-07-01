import { ARM64CodeGenerator } from "./codegen";
import { ARM64Interpreter } from "./interpreter";
import { Lexer, Token } from "./Lexer";
import { IterativeOptimizer } from "./optimiser";

import { Parser, Program } from "./parser";

export class Compiler {
  public static tokenize(source: string): Token[] {
    const tokens = new Lexer(source).scanTokens();
    return tokens;
  }

  public static parse(tokens: Token[]): Program {
    const ast = new Parser(tokens).parse();
    return ast;
  }

  public static optimise(program: Program): Program {
    return new IterativeOptimizer().optimize(program).optimized;
  }

  public static generate(program: Program): string {
    const generator = new ARM64CodeGenerator();
    return generator.generate(program);
  }

  public static interpret(asm: string): string {
    const interpreter = new ARM64Interpreter();
    interpreter.loadAssembly(asm);
    const result = interpreter.execute();
    if (result.error) {
      return result.error;
    }
    return result.output;
  }

  public static compile(source: string, optimise = true): string {
    const tokens = this.tokenize(source);
    const ast = this.parse(tokens);
    if (optimise) {
      return this.generate(this.optimise(ast));
    }
    return this.generate(ast);
  }
}
