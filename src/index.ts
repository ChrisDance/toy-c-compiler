import { ARM64CodeGenerator } from "./codegen";
import { ARM64Interpreter } from "./interpreter";
import { Lexer, Token } from "./Lexer";
import { OptimisationResult, Optimizer } from "./optimiser";

import { Parser, Program } from "./parser";

export class Compiler {
  public static tokenize(source: string): Token[] {
    return new Lexer().load(source).run();
  }

  public static parse(tokens: Token[]): Program {
    return new Parser().load(tokens).run();
  }

  public static optimise(program: Program): OptimisationResult {
    return new Optimizer().load(program).run();
  }

  public static generate(program: Program): string {
    return new ARM64CodeGenerator().load(program).run();
  }

  public static interpret(asm: string): string {
    const interpreter = new ARM64Interpreter().load(asm);
    const result = interpreter.run();
    if (result.error) {
      return result.error;
    }
    return result.output;
  }

  public static compile(source: string, optimise = true): string {
    const tokens = this.tokenize(source);
    const ast = this.parse(tokens);
    if (optimise) {
      return this.generate(this.optimise(ast).asm);
    }
    return this.generate(ast);
  }
}
