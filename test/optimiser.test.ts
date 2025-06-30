// test/enhanced-optimizer.test.ts
import { IterativeOptimizer } from "../src/optimiser";

import { Lexer } from "../src/Lexer";
import { Parser } from "../src/parser";

describe("Enhanced Optimizer", () => {
  function optimizeCode(input: string, maxPasses = 5) {
    const lexer = new Lexer(input);
    const tokens = lexer.scanTokens();
    const parser = new Parser(tokens);
    const program = parser.parse();

    const optimizer = new IterativeOptimizer();
    return optimizer.optimize(program, maxPasses);
  }

  test("should perform multiple passes until convergence", () => {
    const input = `
      int main() {
        int x = 2 + 3;
        int y = x * 1;
        int z = y + 0;
        if (1 > 0) {
          printf(z);
        } else {
          printf(999);
        }
        return 0;
      }
    `;

    const { optimized, stats } = optimizeCode(input);

    console.log("Optimization Statistics:");
    console.log(`Passes: ${stats.passes}`);
    console.log(`Constant folding: ${stats.constantFolding}`);
    console.log(`Constant propagation: ${stats.constantPropagation}`);
    console.log(`Algebraic simplification: ${stats.algebraicSimplification}`);
    console.log(`Dead code elimination: ${stats.deadCodeElimination}`);

    expect(stats.passes).toBeGreaterThan(1);
    expect(stats.constantFolding).toBeGreaterThan(0);
    expect(stats.constantPropagation).toBeGreaterThan(0);
  });

  test("should propagate constants through multiple assignments", () => {
    const input = `
      int main() {
        int a = 5;
        int b = a;
        int c = b + 10;
        int d = c * 2;
        printf(d);
        return 0;
      }
    `;

    const { optimized, stats } = optimizeCode(input);

    // Should propagate: a=5, b=5, c=15, d=30
    expect(stats.constantPropagation).toBeGreaterThan(0);
    expect(stats.constantFolding).toBeGreaterThan(0);
  });

  test("should eliminate unreachable code after constant folding", () => {
    const input = `
      int main() {
        int x = 10;
        if (5 > 10) {
          printf(1);
          printf(2);
          printf(3);
        } else {
          printf(x);
        }
        return 0;
      }
    `;

    const { optimized, stats } = optimizeCode(input);

    // The condition 5 > 10 should be folded to false (0)
    // The then branch should be eliminated
    expect(stats.constantFolding).toBeGreaterThan(0);
    expect(stats.deadCodeElimination).toBeGreaterThan(0);
  });

  test("should handle complex algebraic simplifications", () => {
    const input = `
      int main() {
        int x = 42;
        int y = x * 1 + 0;
        int z = y - 0;
        int w = z / 1;
        int result = w * 0 + 100;
        printf(result);
        return 0;
      }
    `;

    const { optimized, stats } = optimizeCode(input);

    // Should simplify: x*1+0 -> x, y-0 -> y, z/1 -> z, w*0+100 -> 100
    expect(stats.algebraicSimplification).toBeGreaterThan(3);
    expect(stats.constantPropagation).toBeGreaterThan(0);
  });

  test("should optimize loops with constant conditions", () => {
    const input = `
      int main() {
        int sum = 0;
        while (0 > 1) {
          sum = sum + 1;
          printf(sum);
        }
        printf(sum);
        return 0;
      }
    `;

    const { optimized, stats } = optimizeCode(input);

    // The while loop condition 0 > 1 should be folded to false
    // The entire loop body should be eliminated as dead code
    expect(stats.constantFolding).toBeGreaterThan(0);
    expect(stats.deadCodeElimination).toBeGreaterThan(0);
  });

  test("should perform iterative optimization", () => {
    const input = `
      int main() {
        int a = 1 + 2;
        int b = a + 0;
        int c = b * 1;
        int d = c + (4 * 5);
        printf(d);
        return 0;
      }
    `;

    const { optimized, stats } = optimizeCode(input, 10);

    console.log("Multi-pass optimization results:");
    console.log(`Total passes: ${stats.passes}`);
    console.log(`Constant folding: ${stats.constantFolding}`);
    console.log(`Constant propagation: ${stats.constantPropagation}`);
    console.log(`Algebraic simplification: ${stats.algebraicSimplification}`);

    // Should fold 1+2=3, then propagate a=3, simplify b=3+0=3, c=3*1=3,
    // fold 4*5=20, then d=3+20=23
    expect(stats.passes).toBeGreaterThan(1);
    expect(
      stats.constantFolding +
        stats.constantPropagation +
        stats.algebraicSimplification,
    ).toBeGreaterThan(5);
  });

  test("should build control flow graph correctly", () => {
    const input = `
      int main() {
        int x = 5;
        if (x > 3) {
          x = x + 1;
          if (x > 6) {
            printf(x);
          }
        } else {
          x = x - 1;
        }
        printf(x);
        return 0;
      }
    `;

    const { optimized, stats } = optimizeCode(input);

    // Should handle nested control flow correctly
    expect(stats.passes).toBeGreaterThan(0);
    // The optimizer should still work even with complex control flow
    expect(optimized.functions.length).toBe(1);
  });

  test("should handle function calls without side effects optimization", () => {
    const input = `
      int Square(int x) {
        return x * x;
      }

      int main() {
        int a = 2 + 3;
        int b = Square(a);
        int c = b + 0;
        printf(c);
        return 0;
      }
    `;

    const { optimized, stats } = optimizeCode(input);

    // Should optimize arithmetic but preserve function calls
    expect(stats.constantFolding).toBeGreaterThan(0);
    expect(stats.constantPropagation).toBeGreaterThan(0);
    expect(stats.algebraicSimplification).toBeGreaterThan(0);
  });

  test("should demonstrate convergence with complex expressions", () => {
    const input = `
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

    const { optimized, stats } = optimizeCode(input, 15);

    console.log("Complex expression optimization:");
    console.log(`Converged after ${stats.passes} passes`);
    console.log(`Constant folding: ${stats.constantFolding}`);
    console.log(`Constant propagation: ${stats.constantPropagation}`);
    console.log(`Algebraic simplification: ${stats.algebraicSimplification}`);

    // This should require multiple passes to fully optimize
    // Pass 1: Fold 2+3=5, 1*5=5, 0*999=0
    // Pass 2: Propagate w=5, fold x=5+0=5, y=5-0=5, z=5/1=5
    // Pass 3: Fold z==5 to true, simplify z*1+0 to z
    // Pass 4: Further propagation if needed
    expect(stats.passes).toBeGreaterThan(2);
    expect(
      stats.constantFolding + stats.algebraicSimplification,
    ).toBeGreaterThan(5);
  });
});
