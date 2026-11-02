import {
  assertTaskTransition,
  BusinessError,
  checkRange,
  Deposit,
  isOverdue,
  nextInspection,
  outsideRange,
  RecordFile,
  requireFound,
} from '../src/domain/model';
describe('Reglas puras de conservación', () => {
  const d = { tempMin: 18, tempMax: 24, humidityMin: 40, humidityMax: 60 } as Deposit;
  it('incluye los límites del rango y detecta cada extremo', () => {
    expect(outsideRange({ temperature: 18, humidity: 40 }, d)).toBe(false);
    expect(outsideRange({ temperature: 24, humidity: 60 }, d)).toBe(false);
    for (const r of [
      { temperature: 17, humidity: 50 },
      { temperature: 25, humidity: 50 },
      { temperature: 20, humidity: 39 },
      { temperature: 20, humidity: 61 },
    ])
      expect(outsideRange(r, d)).toBe(true);
  });
  it('valida umbrales, valores existentes y calendario', () => {
    expect(() => checkRange(d)).not.toThrow();
    expect(() => checkRange({ ...d, tempMin: 24 })).toThrow(BusinessError);
    expect(() => checkRange({ ...d, humidityMin: 60 })).toThrow(BusinessError);
    expect(requireFound('sí', 'Valor')).toBe('sí');
    expect(() => requireFound(null, 'Valor')).toThrow('no encontrado');
    expect(nextInspection(new Date('2026-01-31T12:00:00Z'), 1).toISOString()).toBe(
      '2026-02-01T12:00:00.000Z',
    );
    const r = { archived: false, nextInspectionAt: new Date(0) } as RecordFile;
    expect(isOverdue(r, new Date(1))).toBe(true);
    expect(isOverdue(r, new Date(0))).toBe(false);
    expect(isOverdue({ ...r, archived: true }, new Date(1))).toBe(false);
  });
  it('solo permite avanzar tareas y exige resultados al completar', () => {
    expect(() => assertTaskTransition('PENDING', 'IN_PROGRESS', '')).not.toThrow();
    expect(() => assertTaskTransition('PENDING', 'DONE', 'Intervención terminada')).not.toThrow();
    expect(() =>
      assertTaskTransition('IN_PROGRESS', 'DONE', 'Intervención terminada'),
    ).not.toThrow();
    expect(() => assertTaskTransition('IN_PROGRESS', 'PENDING', '')).toThrow('Transición');
    expect(() => assertTaskTransition('DONE', 'IN_PROGRESS', '')).toThrow('Transición');
    expect(() => assertTaskTransition('PENDING', 'DONE', 'breve')).toThrow('mínimo');
  });
});
