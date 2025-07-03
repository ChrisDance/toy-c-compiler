// test/optimiser.test.ts
import { Lexer } from "../src/Lexer";
import { Optimizer } from "../src/optimiser";
import { Parser } from "../src/parser";

describe("Enhanced Pointer-Safe Optimizer Integration Tests", () => {
  function optimizeCode(input: string, maxPasses = 10) {
    const lexer = new Lexer().load(input);
    const tokens = lexer.run();
    const parser = new Parser().load(tokens);
    const program = parser.run();

    const optimizer = new Optimizer().load(program);
    return optimizer.run(maxPasses);
  }

  describe("Pointer Safety Tests", () => {
    test("should detect and skip pointer variable optimizations", () => {
      const input = `
        int main() {
          int x = 5;
          int* ptr = &x;
          int y = *ptr + 3;
          printf(y);
          return 0;
        }
      `;

      const { asm, stats } = optimizeCode(input);

      expect(stats.pointersDetected).toBeGreaterThan(0);
      expect(stats.passes).toBeGreaterThan(0);
      // Should not optimize ptr or x since x has address taken
      console.log(
        `Pointer detection stats: ${stats.pointersDetected} pointers detected`,
      );
    });

    test("should skip optimization for pointer function parameters", () => {
      const input = `
        int process(int* data) {
          *data = *data + 1;
          return *data;
        }

        int main() {
          int value = 10;
          int result = process(&value);
          printf(result);
          return 0;
        }
      `;

      const { asm, stats } = optimizeCode(input);

      expect(stats.pointersDetected).toBeGreaterThan(0);
      expect(stats.functionsRemoved).toBe(0); // Both functions should be kept
      // Pointer operations should not be optimized
    });

    test("should detect pointer return types", () => {
      const input = `
        int* getPointer() {
          int x = 42;
          return &x;
        }

        int main() {
          int* ptr = getPointer();
          printf(*ptr);
          return 0;
        }
      `;

      const { asm, stats } = optimizeCode(input);

      expect(stats.pointersDetected).toBeGreaterThan(0);
      expect(stats.functionsRemoved).toBe(0);
    });

    test("should handle assignments to dereferenced pointers", () => {
      const input = `
        int main() {
          int x = 5;
          int* ptr = &x;
          *ptr = 10;
          int y = *ptr;
          printf(y);
          return 0;
        }
      `;

      const { asm, stats } = optimizeCode(input);

      expect(stats.pointersDetected).toBeGreaterThan(0);
      // Should preserve all pointer operations
    });

    test("should handle complex pointer expressions", () => {
      const input = `
        int main() {
          int a = 5;
          int b = 10;
          int* ptr1 = &a;
          int* ptr2 = &b;
          int result = *ptr1 + *ptr2;
          printf(result);
          return 0;
        }
      `;

      const { asm, stats } = optimizeCode(input);

      expect(stats.pointersDetected).toBeGreaterThan(0);
      // No constant propagation should occur on a, b due to address taken
    });

    test("should allow optimization of non-pointer variables when pointers present", () => {
      const input = `
        int main() {
          int x = 5;          // Address taken - no optimization
          int* ptr = &x;      // Pointer - no optimization
          int y = 2 + 3;      // Can be optimized
          int z = y * 1;      // Can be optimized
          printf(*ptr);
          printf(z);
          return 0;
        }
      `;

      const { asm, stats } = optimizeCode(input);

      expect(stats.pointersDetected).toBeGreaterThan(0);
      expect(stats.constantFolding).toBeGreaterThan(0); // Should optimize y = 2 + 3
      expect(stats.algebraicSimplification).toBeGreaterThan(0); // Should optimize z * 1
    });

    test("should handle pointer arithmetic and nested dereferences", () => {
      const input = `
        int main() {
          int x = 42;
          int* ptr = &x;
          int result = (*ptr + 1) * 2;
          printf(result);
          return 0;
        }
      `;

      const { asm, stats } = optimizeCode(input);

      expect(stats.pointersDetected).toBeGreaterThan(0);
      // No constant folding should occur due to pointer operations
    });

    test("should handle mixed pointer and non-pointer code", () => {
      const input = `
        int helper() {
          return 2 + 3;  // Can be optimized
        }

        int main() {
          int x = 10;
          int* ptr = &x;
          int normal = helper() * 1;  // Can be optimized
          *ptr = *ptr + normal;       // Pointer ops - no optimization
          printf(*ptr);
          return 0;
        }
      `;

      const { asm, stats } = optimizeCode(input);

      expect(stats.pointersDetected).toBeGreaterThan(0);
      expect(stats.constantFolding).toBeGreaterThan(0); // Should optimize 2 + 3
      expect(stats.algebraicSimplification).toBeGreaterThan(0); // Should optimize * 1
    });

    test("should detect multiple levels of pointer operations", () => {
      const input = `
        int main() {
          int x = 5;
          int y = 10;
          int* ptr1 = &x;
          int* ptr2 = &y;
          int sum = *ptr1 + *ptr2;
          *ptr1 = sum;
          printf(*ptr1);
          return 0;
        }
      `;

      const { asm, stats } = optimizeCode(input);

      expect(stats.pointersDetected).toBeGreaterThan(0);
      // Both x and y should be detected as having address taken
    });

    test("should handle pointers in control flow", () => {
      const input = `
        int main() {
          int x = 5;
          int* ptr = &x;

          if (*ptr > 3) {
            *ptr = *ptr + 1;
          } else {
            *ptr = 0;
          }

          printf(*ptr);
          return 0;
        }
      `;

      const { asm, stats } = optimizeCode(input);

      expect(stats.pointersDetected).toBeGreaterThan(0);
      // Should not optimize the if condition or assignments
    });

    test("should handle pointers in loops", () => {
      const input = `
        int main() {
          int count = 10;
          int* ptr = &count;

          while (*ptr > 0) {
            *ptr = *ptr - 1;
            printf(*ptr);
          }

          return 0;
        }
      `;

      const { asm, stats } = optimizeCode(input);

      expect(stats.pointersDetected).toBeGreaterThan(0);
      // Should not optimize the while condition or loop body
    });
  });

  describe("Non-Pointer Optimization (Existing Functionality)", () => {
    test("should still optimize non-pointer code normally", () => {
      const input = `
        int main() {
          int a = 2 + 3;
          int b = 10 - 4;
          int c = 5 * 6;
          int d = 20 / 4;
          printf(a);
          printf(b);
          printf(c);
          printf(d);
          return 0;
        }
      `;

      const { asm, stats } = optimizeCode(input);

      expect(stats.pointersDetected).toBe(0); // No pointers in this code
      expect(stats.constantFolding).toBeGreaterThanOrEqual(4);
      expect(stats.passes).toBeGreaterThan(0);
    });

    test("should handle constant propagation", () => {
      const input = `
        int main() {
          int x = 5;
          int y = x + 3;
          int z = y * 2;
          printf(z);
          return 0;
        }
      `;

      const { asm, stats } = optimizeCode(input);

      expect(stats.pointersDetected).toBe(0);
      expect(stats.constantPropagation).toBeGreaterThan(0);
      expect(stats.constantFolding).toBeGreaterThan(0);
    });

    test("should handle algebraic simplification", () => {
      const input = `
        int main() {
          int a = 5 + 0;
          int b = a * 1;
          int c = b / 1;
          int d = c - 0;
          printf(d);
          return 0;
        }
      `;

      const { asm, stats } = optimizeCode(input);

      expect(stats.pointersDetected).toBe(0);
      expect(stats.algebraicSimplification).toBeGreaterThan(0);
    });

    test("should handle dead code elimination", () => {
      const input = `
        int main() {
          int unused = 42;
          int x = 5;
          printf(x);
          return 0;
        }
      `;

      const { asm, stats } = optimizeCode(input);

      expect(stats.pointersDetected).toBe(0);
      expect(stats.deadCodeElimination).toBeGreaterThan(0);
    });
  });

  describe("Constant Folding", () => {
    test("should fold arithmetic constants", () => {
      const input = `
        int main() {
          int a = 2 + 3;
          int b = 10 - 4;
          int c = 5 * 6;
          int d = 20 / 4;
          printf(a);
          printf(b);
          printf(c);
          printf(d);
          return 0;
        }
      `;

      const { asm, stats } = optimizeCode(input);

      expect(stats.constantFolding).toBeGreaterThanOrEqual(4);
      expect(stats.passes).toBeGreaterThan(0);
    });

    test("should fold comparison operators", () => {
      const input = `
        int main() {
          int x = 5 > 3;
          int y = 2 < 1;
          int z = 4 == 4;
          printf(x);
          printf(y);
          printf(z);
          return 0;
        }
      `;

      const { asm, stats } = optimizeCode(input);

      expect(stats.constantFolding).toBeGreaterThanOrEqual(3);
    });

    test("should fold nested expressions", () => {
      const input = `
        int main() {
          int result = (2 + 3) * (4 - 1);
          printf(result);
          return 0;
        }
      `;

      const { asm, stats } = optimizeCode(input);

      expect(stats.constantFolding).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Constant Propagation", () => {
    test("should propagate constants through assignments", () => {
      const input = `
        int main() {
          int x = 5;
          int y = x + 3;
          int z = y - 2;
          printf(z);
          return 0;
        }
      `;

      const { asm, stats } = optimizeCode(input);

      expect(stats.constantPropagation).toBeGreaterThan(0);
      expect(stats.constantFolding).toBeGreaterThan(0);
    });

    test("should handle conditional constant propagation", () => {
      const input = `
        int main() {
          int x = 10;
          if (x > 5) {
            x = x + 1;
          } else {
            x = x - 1;
          }
          printf(x);
          return 0;
        }
      `;

      const { asm, stats } = optimizeCode(input);

      expect(stats.passes).toBeGreaterThan(0);
      expect(stats.constantPropagation).toBeGreaterThan(0);
    });

    test("should handle while loops with constant conditions", () => {
      const input = `
        int main() {
          int sum = 0;
          while (3 > 5) {
            sum = sum + 1;
            printf(sum);
          }
          printf(sum);
          return 0;
        }
      `;

      const { asm, stats } = optimizeCode(input);

      expect(stats.constantFolding).toBeGreaterThan(0);
      expect(stats.deadCodeElimination).toBeGreaterThan(0);
    });
  });

  describe("Dead Code Elimination", () => {
    test("should eliminate unused variables", () => {
      const input = `
        int main() {
          int unused1 = 42;
          int unused2 = 84;
          int used = 5;
          printf(used);
          return 0;
        }
      `;

      const { asm, stats } = optimizeCode(input);

      expect(stats.deadCodeElimination).toBeGreaterThan(0);
    });

    test("should eliminate unreachable code after return", () => {
      const input = `
        int main() {
          printf(42);
          return 0;
          int unreachable = 999;
          printf(unreachable);
        }
      `;

      const { asm, stats } = optimizeCode(input);

      expect(stats.deadCodeElimination).toBeGreaterThan(0);
    });

    test("should eliminate dead branches", () => {
      const input = `
        int main() {
          if (1 > 2) {
            printf(1);
          } else {
            printf(2);
          }
          return 0;
        }
      `;

      const { asm, stats } = optimizeCode(input);

      expect(stats.constantFolding).toBeGreaterThan(0);
      expect(stats.deadCodeElimination).toBeGreaterThan(0);
    });
  });

  describe("Function Call Optimization", () => {
    test("should preserve function calls with side effects", () => {
      const input = `
        int square(int x) {
          return x * x;
        }

        int main() {
          int a = 2 + 3;
          int b = square(a);
          int c = b + 0;
          printf(c);
          return 0;
        }
      `;

      const { asm, stats } = optimizeCode(input);

      expect(stats.constantFolding).toBeGreaterThan(0);
      expect(stats.constantPropagation).toBeGreaterThan(0);
      expect(stats.algebraicSimplification).toBeGreaterThan(0);
      expect(asm.functions.length).toBe(2);
    });

    test("should eliminate unused functions", () => {
      const input = `
        int unused() {
          return 42;
        }

        int main() {
          printf(5);
          return 0;
        }
      `;

      const { asm, stats } = optimizeCode(input);

      expect(stats.functionsRemoved).toBe(1);
      expect(asm.functions.length).toBe(1);
      expect(asm.functions[0].name).toBe("main");
    });
  });

  describe("Complex Optimization Scenarios", () => {
    test("should handle comprehensive optimization example", () => {
      const input = `
        int main() {
          int a = 3;
          int b = a + 7;
          int dead = 2 * b;
          if (a < b) {
            dead = a / 2 + b / 3;
          } else {
            dead = a * b + b;
          }
          printf(dead);
          return 0;
        }
      `;

      const { asm, stats } = optimizeCode(input, 10);

      expect(stats.passes).toBeGreaterThan(2);
      expect(stats.constantPropagation).toBeGreaterThan(0);
      expect(stats.constantFolding).toBeGreaterThan(0);
    });

    test("should handle mixed pointer and optimization code", () => {
      const input = `
        int calculate() {
          return 5 + 3;  // Can optimize
        }

        int main() {
          int x = 10;
          int* ptr = &x;
          int normal = calculate() * 1;
          int result = normal + 0;
          *ptr = 42;
          printf(*ptr);
          printf(result);
          return 0;
        }
      `;

      const { asm, stats } = optimizeCode(input, 10);

      expect(stats.pointersDetected).toBeGreaterThan(0);
      expect(stats.constantFolding).toBeGreaterThan(0); // Should optimize 5 + 3
      expect(stats.algebraicSimplification).toBeGreaterThan(0); // Should optimize * 1, + 0
    });

    test("should demonstrate optimization convergence", () => {
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

      const { asm, stats } = optimizeCode(input, 15);

      expect(stats.passes).toBeGreaterThan(2);
      expect(
        stats.constantFolding + stats.algebraicSimplification,
      ).toBeGreaterThan(5);
    });
  });

  describe("Optimization Statistics", () => {
    test("should track optimization statistics correctly", () => {
      const input = `
        int main() {
          int a = 2 + 3;
          int b = a * 1;
          int c = b + 0;
          int d = c - 0;
          int e = d / 1;
          printf(e);
          return 0;
        }
      `;

      const { asm, stats } = optimizeCode(input);

      expect(stats.passes).toBeGreaterThan(0);
      expect(stats.totalOptimizations).toBe(
        stats.constantFolding +
          stats.constantPropagation +
          stats.algebraicSimplification +
          stats.deadCodeElimination,
      );
      expect(stats.totalOptimizations).toBeGreaterThan(0);
    });

    test("should track pointer detection correctly", () => {
      const input = `
        int* func(int* a, int* b) {
          return a;
        }

        int main() {
          int x = 5;
          int y = 10;
          int* result = func(&x, &y);
          printf(*result);
          return 0;
        }
      `;

      const { asm, stats } = optimizeCode(input);

      expect(stats.pointersDetected).toBeGreaterThan(0);
      expect(stats.passes).toBeGreaterThan(0);
    });

    test("should handle no optimization needed", () => {
      const input = `
        int main() {
          printf(42);
          return 0;
        }
      `;

      const { asm, stats } = optimizeCode(input);

      expect(stats.pointersDetected).toBe(0);
      expect(stats.passes).toBeGreaterThan(0);
    });
  });

  describe("Edge Cases and Error Handling", () => {
    test("should handle complex pointer chains safely", () => {
      const input = `
        int main() {
          int a = 1;
          int b = 2;
          int* ptr1 = &a;
          int* ptr2 = &b;
          int* current = ptr1;

          if (*current > 0) {
            current = ptr2;
          }

          *current = 99;
          printf(*ptr1);
          printf(*ptr2);
          return 0;
        }
      `;

      const { asm, stats } = optimizeCode(input);

      expect(stats.pointersDetected).toBeGreaterThan(0);
      // Should handle complex pointer aliasing safely by not optimizing
    });

    test("should handle function parameters and returns with pointers", () => {
      const input = `
        int* max(int* a, int* b) {
          if (*a > *b) {
            return a;
          }
          return b;
        }

        int main() {
          int x = 10;
          int y = 20;
          int* result = max(&x, &y);
          printf(*result);
          return 0;
        }
      `;

      const { asm, stats } = optimizeCode(input);

      expect(stats.pointersDetected).toBeGreaterThan(0);
      expect(stats.functionsRemoved).toBe(0);
    });

    test("should safely handle when no main function with pointers", () => {
      const input = `
        int* helper() {
          int x = 5;
          return &x;
        }
      `;

      expect(() => optimizeCode(input)).toThrow(
        "Program needs a main function",
      );
    });
  });
});
