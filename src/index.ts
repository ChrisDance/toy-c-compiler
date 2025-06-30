import { writeFileSync } from "fs";
import { ARM64CodeGenerator } from "./codegen";
import { Lexer } from "./Lexer";
import { IterativeOptimizer } from "./optimiser";
import { Parser } from "./parser";

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

const sourceCode3 = `

  int main() {
    int w = 1 * (2 + 3);
    int x = w + (0 * 999);
    int y = x - 0;
    int z = y / 1;
    if (z == 5) {
      printf(z * 1 + 0);
    }
    return 0;
  }
`;

const sourceCode4 = `

  int main()
  {
    int x = 3;
    int y = x + 7;
    int z = 2 * y;
    if(x > y) {
      z = x / 2 + y / 3;
    } else
    {
      z = x * y + y;
    }
  }`;

// int main()
// {
//   int x = 3;
//   int y = 21
//   int z // or maybe declare it further down I'm not sure
//   if(3 < y) {
//     z = 3 / 2 + y / 3;
//   } else
//   {
//     z = 3 * y + y;
//   }
// }

// int main()
// {

//   int z // or maybe declare it further down I'm not sure
//   if(3 < 21) {
//     z = 3 / 2 + y / 3;
//   } else
//   {
//     z = 3 * y + y;
//   }
// }

const tokens = new Lexer(sourceCode4).scanTokens();
const ast = new Parser(tokens).parse();
const optimizer = new IterativeOptimizer();

const { optimized: optimizedAst, stats } = optimizer.optimize(ast);

console.log("Optimization Statistics:");
console.log(`Constant folding optimizations: ${stats.constantFolding}`);
console.log(`Dead code eliminations: ${stats.deadCodeElimination}`);
console.log(`Algebraic simplifications: ${stats.algebraicSimplification}`);

const asm = new ARM64CodeGenerator().generate(optimizedAst);

writeFileSync("output.s", asm);
