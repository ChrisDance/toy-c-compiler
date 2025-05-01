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
const tokens = new Lexer(input).scanTokens();
const ast = new Parser(tokens).parse();
const asm = new ARM64CodeGenerator().generate(ast);

writeFileSync("output.s", asm);
