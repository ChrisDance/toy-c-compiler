import { writeFileSync } from "fs";
import { ARM64CodeGenerator } from "./codegen";
import { Lexer } from "./Lexer";
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
int countdown() {


int i = 10;
while (i > 0) {
    i = i - 1;
}
    return 9;
}

int main() {
    printf(return countdown());
    return  0;
}
`;

const tokens = new Lexer(sourceCode2).scanTokens();
const ast = new Parser(tokens).parse();
const asm = new ARM64CodeGenerator().generate(ast);

writeFileSync("output.s", asm);
