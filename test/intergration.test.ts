import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { Lexer } from '../src/Lexer';
import { Parser } from '../src/parser';
import { ARM64CodeGenerator } from '../src/codegen';


describe('Compiler Integration Tests', () => {
  const testOutputDir = path.join(__dirname, 'integration-output');
  
  
  function ensureDirExists(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
  
  
  const isMacOSARM64 = process.platform === 'darwin' && process.arch === 'arm64';
  const runOnMacOSARM64 = isMacOSARM64 ? it : it.skip;
  
  beforeAll(() => { 
    ensureDirExists(testOutputDir);
  });
  
  
  function compileToAssembly(sourceCode: string, outputFileName: string): string {
    const outputPath = path.join(testOutputDir, outputFileName);
    
    const lexer = new Lexer(sourceCode);
    const tokens = lexer.scanTokens();
    const parser = new Parser(tokens);
    const program = parser.parse();
    
    const codeGen = new ARM64CodeGenerator();
    const assembly = codeGen.generate(program);
    
    fs.writeFileSync(outputPath, assembly);
    return outputPath;
  }
  
  
  async function compileAndRun(sourceCode: string, testName: string): Promise<string> {
    const assemblyPath = compileToAssembly(sourceCode, `${testName}.s`);
    const objectPath = path.join(testOutputDir, `${testName}.o`);
    const executablePath = path.join(testOutputDir, testName);
    
    
    execSync(`as -o ${objectPath} ${assemblyPath}`, { stdio: 'inherit' });
 
    
    execSync(`ld -o ${executablePath} ${objectPath} -lSystem -syslibroot $(xcrun -sdk macosx --show-sdk-path) -e _main -arch arm64`, 
      { stdio: 'inherit' });
    
    
    return execSync(executablePath).toString().trim();
  }

  
  runOnMacOSARM64('should compile and execute a comprehensive program with all language features', async () => { 
    
    const sourceCode = `
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
    
    const output = await compileAndRun(sourceCode, 'intergration_test');
     
    
    expect(output).toBe('5');
  });
});