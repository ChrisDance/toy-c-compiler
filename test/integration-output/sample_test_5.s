	.section	__TEXT,__text,regular,pure_instructions
	.build_version macos, 15, 0	sdk_version 15, 4

	.globl	_testWhile					 ; -- Begin function testWhile
	.p2align	2
_testWhile:						 ; @testWhile
	sub	sp, sp, #160
	stp	x29, x30, [sp, #144]
	add	x29, sp, #144
	str	w0, [sp, #16]
L1_loop_start:
	ldr	w0, [sp, #16]
	mov	w8, w0
	mov	w0, #3				; =0x3
	mov	w9, w0
	cmp	w8, w9
	cset	w0, gt
	cmp	w0, #0
	beq	L2_loop_end
	ldr	w0, [sp, #16]
	mov	w8, w0
	mov	w0, #1				; =0x1
	mov	w9, w0
	sub	w0, w8, w9
	str	w0, [sp, #16]
	b	L1_loop_start
L2_loop_end:
	ldr	w0, [sp, #16]
	b	L0_function_end
L0_function_end:
	ldp	x29, x30, [sp, #144]
	add	sp, sp, #160
	ret
							 ; -- End function

	.globl	_main					 ; -- Begin function main
	.p2align	2
_main:						 ; @main
	sub	sp, sp, #48
	stp	x29, x30, [sp, #32]			 ; 16-byte Folded Spill
	add	x29, sp, #32
	mov	w0, #5				; =0x5
	bl	_testWhile
mov x9, sp
mov x8, x0
str x8, [x9]
adrp x0, l_.str.0@PAGE
add x0, x0, l_.str.0@PAGEOFF
bl _printf
	mov	w0, #0				; =0x0
	b	L3_function_end
L3_function_end:
	ldp	x29, x30, [sp, #32]			 ; 16-byte Folded Reload
	add	sp, sp, #48
	ret
							 ; -- End function

	.section	__TEXT,__cstring,cstring_literals
l_.str.0:
	.asciz	"%d\n"
.subsections_via_symbols