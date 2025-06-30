import { code_samples } from "./code_samples";
import { ARM64CodeGenerator } from "./codegen";
import { Lexer } from "./Lexer";
import { IterativeOptimizer } from "./optimiser";
import { Parser } from "./parser";

for (const prog of code_samples) {
  const tokens = new Lexer(prog.code).scanTokens();
  const ast = new Parser(tokens).parse();
  const optimizer = new IterativeOptimizer();

  // const { optimized: optimizedAst, stats } = optimizer.optimize(ast);
  // console.log("Optimization Statistics:");
  // console.log(`Constant folding optimizations: ${stats.constantFolding}`);
  // console.log(`Dead code eliminations: ${stats.deadCodeElimination}`);
  // console.log(`Algebraic simplifications: ${stats.algebraicSimplification}`);
  // console.log(`Functions removed : ${stats.functionsRemoved}`);

  let asm;
  asm = new ARM64CodeGenerator().generate(ast);
}
// writeFileSync("output.s", asm);
