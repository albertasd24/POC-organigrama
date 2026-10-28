import { TestBed } from '@angular/core/testing';
import { ProcessDemo as App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('shows custom card fields in the accessible directory', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(compiled.querySelectorAll<HTMLButtonElement>('details button'));
    const person = buttons.find((button) => button.textContent?.includes('Diego Torres'))!;
    expect(person.textContent).toContain('Desarrollador');
    expect(person.textContent).toContain('Tipo: Participante');
    const process = buttons.find((button) => button.textContent?.includes('Productos y servicios digitales'))!;
    expect(process.textContent).not.toContain('Diego Torres');
    expect(buttons).toHaveLength(9);
    expect(compiled.querySelector('details')?.textContent).toContain('Productos y servicios digitales');
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Organigrama');
  });

  it('adds a process through the form', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLInputElement>('[name="titulo"]')!.value = 'Compras';
    element.querySelector<HTMLInputElement>('[name="subtitulo"]')!.value = 'Abastecimiento';
    element.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(element.textContent).toContain('4 procesos');
    expect(element.querySelector('details')?.textContent).toContain('Compras');
    expect(element.querySelector('#selected-process')?.textContent).toBe('Compras');
    expect(element.textContent).toContain('Sin participantes asignados.');
  });

  it('assigns a person, rejects duplicates and removes the assignment', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLSelectElement>('[name="personaId"]')!.value = 'diego';
    element.querySelector<HTMLSelectElement>('[name="cargoId"]')!.value = 'analista';
    const form = element.querySelector<HTMLFormElement>('form:has([name="personaId"])')!;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(element.textContent).toContain('7 asignaciones');
    expect(Array.from(element.querySelectorAll('details button')).some((button) =>
      button.textContent?.includes('Diego Torres') && button.textContent.includes('Analista'))).toBe(true);
    expect(element.querySelectorAll('details button')).toHaveLength(10);
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('ya tiene ese cargo');
    element.querySelector<HTMLButtonElement>('[aria-label="Retirar a Diego Torres como Analista"]')!.click();
    await fixture.whenStable();
    expect(element.textContent).toContain('6 asignaciones');
    expect(element.querySelectorAll('details button')).toHaveLength(9);
    expect(element.querySelector('[aria-label="Retirar a Ana Martinez como Lider de proceso"]')).not.toBeNull();
  });

  it('updates selected process details from the directory', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    Array.from(element.querySelectorAll<HTMLButtonElement>('details button'))
      .find((button) => button.textContent?.includes('Tecnologia'))!.click();
    await fixture.whenStable();
    expect(element.querySelector('#selected-process')?.textContent).toBe('Tecnologia');
    expect(element.querySelector('[aria-label="Participantes del proceso seleccionado"]')?.textContent)
      .toContain('Diego Torres');
  });

  it('selects the owning process when a participant node is clicked', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    Array.from(element.querySelectorAll<HTMLButtonElement>('details button'))
      .find((button) => button.textContent?.includes('Diego Torres'))!.click();
    await fixture.whenStable();
    expect(element.querySelector('#selected-process')?.textContent).toBe('Tecnologia');
    expect(element.querySelector<HTMLSelectElement>('[name="procesoId"]')?.value).toBe('tecnologia');
  });
});
