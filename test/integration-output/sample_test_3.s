	.section	__TEXT,__text,regular,pure_instructions
	.build_version macos, 15, 0	sdk_version 15, 4

	.globl	_Square					 ; -- Begin function Square
	.p2align	2
_Square:						 ; @Square
	sub	sp, sp, #160
	stp	x29, x30, [sp, #144]
	add	x29, sp, #144
	str	w0, [sp, #16]
	ldr	w0, [sp, #16]
	mov	w8, w0
	ldr	w0, [sp, #16]
	mov	w9, w0
	mul	w0, w8, w9
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
	mov	w8, #5				; =0x5
	stur	w8, [x29, #-4]
	mov	w8, #4				; =0x4
	stur	w8, [x29, #-8]
	ldur	w0, [x29, #-8]
	mov	w8, w0
	ldur	w0, [x29, #-4]
	mov	w9, w0
	add	w0, w8, w9
	stur	w0, [x29, #-12]
	ldur	w0, [x29, #-4]
	mov	w8, w0
	ldur	w0, [x29, #-12]
	mov	w9, w0
	cmp	w8, w9
	cset	w0, gt
	cmp	w0, #0
	beq	L3_else
	mov	w0, #2				; =0x2
	bl	_Square
	bl	_Square
mov x9, sp
mov x8, x0
str x8, [x9]
adrp x0, l_.str.0@PAGE
add x0, x0, l_.str.0@PAGEOFF
bl _printf
	b	L2_endif
L3_else:
	mov	w0, #5				; =0x5
mov x9, sp
mov x8, x0
str x8, [x9]
adrp x0, l_.str.1@PAGE
add x0, x0, l_.str.1@PAGEOFF
bl _printf
L2_endif:
	mov	w0, #0				; =0x0
	b	L1_function_end
L1_function_end:
	ldp	x29, x30, [sp, #32]			 ; 16-byte Folded Reload
	add	sp, sp, #48
	ret
							 ; -- End function

	.section	__TEXT,__cstring,cstring_literals
l_.str.0:
	.asciz	"%d\n"
l_.str.1:
	.asciz	"%d\n"
.subsections_via_symbols