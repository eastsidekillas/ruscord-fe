import { Component, forwardRef, Input } from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import {CommonModule, NgClass} from '@angular/common';

@Component({
  selector: 'app-input',
  standalone: true,
  template: `
    <input
      [type]="type"
      class="w-full p-3 bg-main-surface-secondary text-sm text-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
      [attr.placeholder]="placeholder"
      [disabled]="disabled"
      [value]="value"
      (input)="onInput($event)"
      [attr.name]="name"
      [attr.autocomplete]="autocomplete"
      [attr.maxlength]="maxlength"
      [attr.minlength]="minlength"
    />
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true,
    },
  ],
  imports: [
   CommonModule
  ]
})
export class InputComponent implements ControlValueAccessor {
  @Input() type: string = 'text';
  @Input() placeholder?: string;
  @Input() disabled = false;
  @Input() name?: string;
  @Input() autocomplete?: string;
  @Input() maxlength?: number;
  @Input() minlength?: number;

  value: string = '';

  private onChange = (value: string) => {};
  private onTouched = () => {};

  onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.value = input.value;
    this.onChange(this.value);
  }

  writeValue(value: string): void {
    this.value = value;
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
