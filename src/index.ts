import { writeFileSync } from "fs";
import { ARM64CodeGenerator } from "./codegen";
import { Lexer } from "./Lexer";
import { Parser } from "./parser";
import { BasicOptimizer } from "./optimiser";

const input = `

      int Square(int arg)
      {
          return arg * arg;
      }

      int main()
      {
          int i = 5;
          int k = 4;
          int j = k + i;
          if(i > j)
          {
            printf(Square(Square(2)));
          }
          else
          {
              printf(5);
          }
          return 0;
      }
    `;

const sourceCode2 = `
int main() {
  int x = 2 + 3;
  if (4 > 0) {
    x = x * 1;
  } else {
    x = 999;
  }
  printf(x);
  return 0;
}
`;

const tokens = new Lexer(sourceCode2).scanTokens();
const ast = new Parser(tokens).parse();
const optimizer = new BasicOptimizer();

const { optimized: optimizedAst, stats } = optimizer.optimize(ast);

console.log("Optimization Statistics:");
console.log(`Constant folding optimizations: ${stats.constantFolding}`);
console.log(`Dead code eliminations: ${stats.deadCodeElimination}`);
console.log(`Algebraic simplifications: ${stats.algebraicSimplification}`);

const asm = new ARM64CodeGenerator().generate(optimizedAst);

writeFileSync("output.s", asm);
