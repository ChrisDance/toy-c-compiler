	.section	__TEXT,__text,regular,pure_instructions
	.build_version macos, 15, 0	sdk_version 15, 4

	.globl	_Square					 ; -- Begin function Square
	.p2align	2
_Square:						 ; @Square
	sub	sp, sp, #32
	str	w0, [sp, #8]
	ldr	w0, [sp, #8]
	mov	w8, w0
	ldr	w0, [sp, #8]
	mov	w9, w0
	mul	w0, w8, w9
	add	sp, sp, #32
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
	beq	L1_else
	mov	w0, #2				; =0x2
	bl	_Square
	bl	_Square
mov x9, sp
mov x8, x0
str x8, [x9]
adrp x0, l_.str@PAGE
add x0, x0, l_.str@PAGEOFF
bl _printf
	b	L0_endif
L1_else:
	mov	w0, #5				; =0x5
mov x9, sp
mov x8, x0
str x8, [x9]
adrp x0, l_.str@PAGE
add x0, x0, l_.str@PAGEOFF
bl _printf
L0_endif:
	mov	w0, #0				; =0x0
	ldp	x29, x30, [sp, #32]			 ; 16-byte Folded Reload
	add	sp, sp, #48
	ret
							 ; -- End function

	.section	__TEXT,__cstring,cstring_literals
l_.str:
	.asciz	"%d\n"
.subsections_via_symbols