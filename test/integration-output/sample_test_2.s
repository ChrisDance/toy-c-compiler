	.section	__TEXT,__text,regular,pure_instructions
	.build_version macos, 15, 0	sdk_version 15, 4

	.globl	_main					 ; -- Begin function main
	.p2align	2
_main:						 ; @main
	sub	sp, sp, #48
	stp	x29, x30, [sp, #32]			 ; 16-byte Folded Spill
	add	x29, sp, #32
	mov	w0, #3				; =0x3
	mov	w8, w0
	mov	w0, #2				; =0x2
	mov	w9, w0
	add	w0, w8, w9
	mov	w9, w0
	mov	w0, #1				; =0x1
	mov	w8, w0
	mov	w0, #0				; =0x0
	mov	w10, w0
	add	w0, w8, w10
	mov	w10, w0
	mul	w0, w9, w10
	stur	w0, [x29, #-4]
	ldur	w0, [x29, #-4]
	mov	w10, w0
	mov	w0, #1				; =0x1
	mov	w9, w0
	sdiv	w0, w10, w9
	mov	w9, w0
	mov	w0, #0				; =0x0
	mov	w10, w0
	mov	w0, #999				; =0x3e7
	mov	w8, w0
	mul	w0, w10, w8
	mov	w8, w0
	add	w0, w9, w8
	stur	w0, [x29, #-8]
	ldur	w0, [x29, #-8]
mov x9, sp
mov x8, x0
str x8, [x9]
adrp x0, l_.str.0@PAGE
add x0, x0, l_.str.0@PAGEOFF
bl _printf
	mov	w0, #0				; =0x0
	b	L0_function_end
L0_function_end:
	ldp	x29, x30, [sp, #32]			 ; 16-byte Folded Reload
	add	sp, sp, #48
	ret
							 ; -- End function

	.section	__TEXT,__cstring,cstring_literals
l_.str.0:
	.asciz	"%d\n"
.subsections_via_symbols