import { TestBed } from '@angular/core/testing';
import { ProcessDemo } from './app';
import { OrgChartComponent } from './org-chart';
import { By } from '@angular/platform-browser';

describe('ProcessDemo', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ProcessDemo] }).compileComponents();
  });

  it('renders process, area and cargo types in a single-root hierarchy', async () => {
    const fixture = TestBed.createComponent(ProcessDemo);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const component = fixture.componentInstance as unknown as {
      nodes: () => readonly { name: string; parentId: string | null; data?: { kind: string } }[];
    };
    expect(element.querySelector('h1')?.textContent).toContain('Organigrama de procesos');
    expect(element.querySelectorAll('[aria-label="Opcion del proceso"] button')).toHaveLength(2);
    expect(element.querySelectorAll('nav[aria-label="Lista de procesos"] button')).toHaveLength(3);
    expect(component.nodes().filter((node) => node.parentId === null)).toHaveLength(1);
    expect(component.nodes().map((node) => node.data?.kind)).toEqual([
      'process', 'area', 'cargo', 'cargo', 'area', 'cargo', 'area', 'cargo',
    ]);
    expect(element.querySelector('details')?.textContent).toContain('Tipo: Proceso');
  });

  it('keeps X and Y as options outside the chart and switches the selected process', async () => {
    const fixture = TestBed.createComponent(ProcessDemo);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const optionButtons = element.querySelectorAll<HTMLButtonElement>('[aria-label="Opcion del proceso"] button');
    optionButtons[1].click();
    await fixture.whenStable();
    expect(element.querySelector('#selected-process')?.textContent).toContain('Gestion empresarial');
    expect(Array.from(element.querySelectorAll('details button')).some((button) => button.textContent?.trim() === 'Y')).toBe(false);
    element.querySelector<HTMLButtonElement>('nav[aria-label="Lista de procesos"] button:nth-child(2)')!.click();
    await fixture.whenStable();
    expect(element.querySelector('#selected-process')?.textContent).toContain('Atencion al cliente');
    expect(element.querySelector('[aria-label="Opcion del proceso"] button[aria-pressed="true"]')?.textContent).toBe('X');
  });

  it('creates a process with X/Y options but no option nodes', async () => {
    const fixture = TestBed.createComponent(ProcessDemo);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLInputElement>('[name="titulo"]')!.value = 'Compras';
    element.querySelector<HTMLInputElement>('[name="subtitulo"]')!.value = 'Abastecimiento';
    element.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(element.querySelectorAll('nav[aria-label="Lista de procesos"] button')).toHaveLength(4);
    expect(element.querySelector('#selected-process')?.textContent).toContain('Compras');
    expect(element.querySelectorAll('[aria-label="Opcion del proceso"] button')).toHaveLength(2);
    const chart = fixture.debugElement.query(By.directive(OrgChartComponent)).componentInstance as OrgChartComponent;
    expect(chart.nodes().map((node) => node.data?.kind)).toEqual(['process']);
  });

  it('assigns a person to a cargo, rejects duplicates, and supports removal', async () => {
    const fixture = TestBed.createComponent(ProcessDemo);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const form = element.querySelector<HTMLFormElement>('form:has([name="personaId"])')!;
    element.querySelector<HTMLSelectElement>('[name="personaId"]')!.value = 'sofia';
    element.querySelector<HTMLSelectElement>('[name="cargoId"]')!.value = 'lider-digital';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(element.textContent).toContain('7 personas asignadas');
    expect(element.querySelector('[aria-label="Personas asignadas al cargo"]')?.textContent).toContain('Sofia Lopez');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('ya esta asignada');
    element.querySelector<HTMLButtonElement>('[aria-label="Retirar a Sofia Lopez del cargo Lider de tecnologia"]')!.click();
    await fixture.whenStable();
    expect(element.textContent).toContain('6 personas asignadas');
    expect(element.querySelector('[aria-label="Personas asignadas al cargo"]')?.textContent).not.toContain('Sofia Lopez');
  });
});