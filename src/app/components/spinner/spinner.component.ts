import { Component, OnDestroy, OnInit, signal } from '@angular/core';

@Component({
  selector: 'spinner',
  templateUrl: './spinner.component.html',
  styleUrl: './spinner.component.scss',
})
export class SpinnerComponent implements OnInit, OnDestroy {
  dots = signal<string>('');
  intervalId: number | undefined;

  ngOnInit(): void {
    this.intervalId = window.setInterval(() => {
      if (this.dots() === '...') {
        this.dots.set('');
      } else {
        this.dots.set(this.dots() + '.');
      }
    }, 300);
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
