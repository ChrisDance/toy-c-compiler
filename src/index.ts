import { writeFileSync } from "fs";
import { working } from "./code_samples";
import { ARM64CodeGenerator } from "./codegen";
import { Lexer } from "./Lexer";
import { IterativeOptimizer } from "./optimiser";
import { Parser } from "./parser";
import { LOG } from "./utils";
let i = 1;
// working.unshift(
//

//
//
// );
for (const prog of working) {
  const tokens = new Lexer(prog.code).scanTokens();
  const ast = new Parser(tokens).parse();
  console.log(JSON.stringify(ast));
  const optimizer = new IterativeOptimizer();

  LOG(optimizer.optimize(ast));
  break;
  // const { optimized: optimizedAst, stats } = optimizer.optimize(ast);
  // console.log("Optimization Statistics:");
  // console.log(`Constant folding optimizations: ${stats.constantFolding}`);
  // console.log(`Dead code eliminations: ${stats.deadCodeElimination}`);
  // console.log(`Algebraic simplifications: ${stats.algebraicSimplification}`);
  // console.log(`Functions removed : ${stats.functionsRemoved}`);

  let asm;
  asm = new ARM64CodeGenerator().generate(ast);
  writeFileSync("output.s", asm);
  break;
}
