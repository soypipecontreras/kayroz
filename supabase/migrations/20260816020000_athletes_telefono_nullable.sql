-- Se me pasó en 20260816000000_coach_auth.sql: coaches.telefono se hizo
-- nullable para el alta vía panel sin bot, pero athletes.telefono se quedó
-- como NOT NULL — el mismo caso de uso aplica: el panel permite agregar un
-- atleta manualmente, sin pasar por WhatsApp, así que todavía no tiene
-- teléfono en ese momento.
alter table athletes alter column telefono drop not null;
