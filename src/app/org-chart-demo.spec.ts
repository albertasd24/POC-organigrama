import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { App } from './app';
import { routes } from './app.routes';
import { OrgChartComponent } from './org-chart';
import { OrgChartDemo } from './org-chart-demo';
import { By } from '@angular/platform-browser';

describe('OrgChartDemo', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [OrgChartDemo], providers: [provideRouter(routes)],
  }));

  it('opens the isolated demo at its own URL and keeps the original screen', async () => {
    const root = TestBed.createComponent(App);
    root.detectChanges();
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/demo/org-chart', OrgChartDemo);
    expect(harness.routeNativeElement?.querySelector('aside')).not.toBeNull();
    await harness.navigateByUrl('/');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('Organigrama de procesos');
  });

  it('shows selected node data in the sidebar through the chart output', async () => {
    const fixture = TestBed.createComponent(OrgChartDemo);
    await fixture.whenStable();
    const chart = fixture.debugElement.query(By.directive(OrgChartComponent)).componentInstance as OrgChartComponent;
    chart.nodeSelected.emit(fixture.componentInstance.nodes().find((node) => node.id === 'cargo-desarrollo')!);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('aside dl').textContent).toContain('Desarrollador');
    expect(fixture.nativeElement.querySelector('aside dl').textContent).toContain('Cargo');
    expect(fixture.nativeElement.querySelector('aside dl').textContent).toContain('carlos@example.com');
  });

  it('creates, edits and deletes a cargo under an area through the consumer form', async () => {
    const fixture = TestBed.createComponent(OrgChartDemo);
    await fixture.whenStable();
    const demo = fixture.componentInstance;
    demo.startCreate();
    demo.form.patchValue({ name: 'Sofia Lopez', role: 'Analista', kind: 'cargo', parentId: 'area-digital', email: 'sofia@example.com' });
    const submit = () => fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    submit();
    await fixture.whenStable();
    expect(demo.nodes()).toHaveLength(8);
    expect(demo.selected()?.parentId).toBe('area-digital');
    demo.form.patchValue({ role: 'Lider de calidad' });
    submit();
    await fixture.whenStable();
    expect(demo.selected()?.role).toBe('Lider de calidad');
    fixture.nativeElement.querySelector('button.danger').click();
    await fixture.whenStable();
    expect(demo.nodes()).toHaveLength(7);
    expect(demo.selectedId()).toBe('area-digital');
  });

  it('rejects invalid changes and requires explicit cascade to delete a branch', async () => {
    const fixture = TestBed.createComponent(OrgChartDemo);
    await fixture.whenStable();
    const demo = fixture.componentInstance;
    demo.selectNode(demo.nodes()[0]);
    demo.form.patchValue({ kind: 'cargo', parentId: 'proceso' });
    demo.save();
    expect(demo.error()).toBeTruthy();
    expect(demo.nodes()[0].parentId).toBeNull();
    demo.remove();
    expect(demo.error()).toContain('tiene hijos');
    expect(demo.nodes()).toHaveLength(3);
    demo.cascade.setValue(true);
    demo.remove();
    expect(demo.nodes()).toHaveLength(0);
    expect(demo.selectedId()).toBeNull();
    expect(demo.creating()).toBe(true);
    demo.form.patchValue({ name: 'Nuevo proceso', role: 'Direccion', kind: 'process', parentId: '' });
    demo.save();
    expect(demo.nodes()).toHaveLength(1);
    expect(demo.selected()?.parentId).toBeNull();
  });

  it('offers only parent nodes valid for the selected node type', async () => {
    const fixture = TestBed.createComponent(OrgChartDemo);
    await fixture.whenStable();
    const demo = fixture.componentInstance;
    demo.startCreate();
    expect(demo.parentNodes().map((node) => node.data?.kind)).toEqual(['process']);
    demo.form.controls.kind.setValue('cargo');
    expect(demo.parentNodes().every((node) => node.data?.kind === 'area')).toBe(true);
  });
});