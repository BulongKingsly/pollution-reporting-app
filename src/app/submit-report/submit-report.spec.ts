import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubmitReport } from './submit-report';

describe('SubmitReport', () => {
  let component: SubmitReport;
  let fixture: ComponentFixture<SubmitReport>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubmitReport]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubmitReport);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
