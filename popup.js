'use strict';

// ── estado ─────────────────────────────────────────────────────────────────────
let relatorio = '';
let running   = false;

// ── helpers de UI ─────────────────────────────────────────────────────────────
function setState(id, cls, txt) {
  const el = document.getElementById(id);
  if (el) { el.className = 'mod-state ' + cls; el.textContent = txt; }
}
function setProgress(n, t) {
  document.getElementById('prog').style.width = Math.round((n / t) * 100) + '%';
}
function setStatus(msg, cls = '') {
  const el = document.getElementById('status');
  el.textContent = msg; el.className = cls;
}
function resetUI() {
  ['s1','s2','s3','s4'].forEach(id => setState(id, '', 'Aguardando'));
  document.getElementById('prog').style.width = '0%';
  document.getElementById('btnDl').disabled = true;
  relatorio = '';
}

// ── injetor genérico ──────────────────────────────────────────────────────────
function inject(tabId, func) {
  return new Promise(resolve => {
    chrome.scripting.executeScript(
      { target: { tabId }, func },
      results => {
        if (chrome.runtime.lastError)
          resolve({ ok: false, texto: 'ERRO: ' + chrome.runtime.lastError.message });
        else
          resolve(results?.[0]?.result ?? { ok: false, texto: 'ERRO: sem resultado' });
      }
    );
  });
}

// ══════════════════════════════════════════════════════════════════════════════
//  TÓPICO 1 — AFASTAMENTOS / LICENÇAS
//  Script original "script_divergencias_export_txt_AFASTAMENTOS"
//  Modificação: suprime o download e retorna { ok, texto, total, divergencias }
// ══════════════════════════════════════════════════════════════════════════════
function scriptAfastamentos() {
  // ─────────────────────────────────────────────────────
  // SCRIPT ORIGINAL INTACTO (apenas download removido)
  // ─────────────────────────────────────────────────────
  let relatorio = '';
  function adicionarLinha(texto = '', nivel = 0) {
      const indentacao = '  '.repeat(nivel);
      relatorio += indentacao + texto + '\n';
  }
  function normalizarTexto(texto) {
      return texto.trim().replace(/\s+/g, ' ').replace(/[.*()]/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ')
          .replace(/Ã/g,'A').replace(/Õ/g,'O').replace(/Â/g,'A').replace(/Ê/g,'E').replace(/Î/g,'I').replace(/Ô/g,'O').replace(/Û/g,'U')
          .replace(/À/g,'A').replace(/È/g,'E').replace(/Ì/g,'I').replace(/Ò/g,'O').replace(/Ù/g,'U')
          .replace(/Á/g,'A').replace(/É/g,'E').replace(/Í/g,'I').replace(/Ó/g,'O').replace(/Ú/g,'U').replace(/Ç/g,'C').toUpperCase();
  }
  function normalizarPosto(texto) {
      return texto
          .replace(/1º TEN(ENTE)?/gi,'1º TENENTE').replace(/2º TEN(ENTE)?/gi,'2º TENENTE')
          .replace(/SUB\s+TEN/gi,'SUBTENENTE').replace(/1º SGT/gi,'1º SARGENTO').replace(/2º SGT/gi,'2º SARGENTO').replace(/3º SGT/gi,'3º SARGENTO')
          .replace(/1[°º]\s*SGT/gi,'1º SARGENTO').replace(/2[°º]\s*SGT/gi,'2º SARGENTO').replace(/3[°º]\s*SGT/gi,'3º SARGENTO')
          .replace(/\bCB\b/gi,'CABO').replace(/SD PM/gi,'SOLDADO').replace(/SOLDADO PM/gi,'SOLDADO').replace(/SOLDADO QPPM/gi,'SOLDADO')
          .replace(/SOLDADO 2° CLASSE QPPM/gi,'SOLDADO DE 2ª CLASSE').replace(/SOLDADO\s+DE\s+2[ªº°]\s+CLASSE/gi,'SOLDADO').replace(/SOLDADO\s+2[ªº°]\s+CLASSE/gi,'SOLDADO')
          .replace(/CB PM/gi,'CABO').replace(/CABO PM/gi,'CABO').replace(/ST /gi,'SUBTENENTE ').replace(/SUBTENETE/gi,'SUBTENENTE')
          .replace(/TEN CEL/gi,'TENENTE CORONEL').replace(/MAJ PM/gi,'MAJOR').replace(/CAP PM/gi,'CAPITÃO').replace(/CEL PM/gi,'CORONEL')
          .replace(/\b(CORONEL|TENENTE\s+CORONEL|MAJOR|CAPITÃO|1º\s+TENENTE|2º\s+TENENTE|SUBTENENTE|1º\s+SARGENTO|2º\s+SARGENTO|3º\s+SARGENTO|CABO|SOLDADO)\s+PM\b/gi,'$1')
          .replace(/\s+QOPM\s+/gi,' ').replace(/\s+QPPM\s+/gi,' ').replace(/\s+QOA\s+/gi,' ').replace(/\s+QOAPM\s+/gi,' ').replace(/\s+QOSPM\s+/gi,' ')
          .replace(/\s+RG\.?\s+/gi,' ').replace(/\s+REF\.?\s+/gi,' ').replace(/\s+R\/R\s+/gi,' ').replace(/\s+/g,' ').trim();
  }
  function extrairNome(texto) {
      const patterns=[/O\(A\)\s+([^,]+?)\s+ESTÁ\s+AUTORIZADO/i,/O\(A\)\s+([^,]+?),.*?\s+ESTÁ\s+AUTORIZADO/i,/O\s+([^,]+?)\s+ESTÁ\s+AUTORIZADO/i,/A\s+([^,]+?)\s+ESTÁ\s+AUTORIZADO/i,/O\(A\)\s+([^,]+?)(?:,\s*CPF:.*?)?,\s+ESTÁ\s+AUTORIZADO/i,/O\s+([^,]+?)(?:,\s*CPF:.*?)?,\s+ESTÁ\s+AUTORIZADO/i,/O\(A\)\s+(.*?)\s+ESTÁ\s+AUTORIZADO/i,/O\s+(.*?)\s+ESTÁ\s+AUTORIZADO/i,/A\s+(.*?)\s+ESTÁ\s+AUTORIZADO/i];
      for(let p of patterns){const m=texto.match(p);if(m){let n=m[1].trim().replace(/,\s*CPF:.*$/i,'').replace(/,.*$/i,'');return normalizarTexto(normalizarPosto(n)).trim();}}
      return null;
  }
  function extrairNumeroId(texto) {
      const patterns=[/\*(\d{1,3}(?:\.\d{2})?|\d+\*+)\*?/,/RG\.?\*?(\d{1,3}(?:\.\d{2})?|\d+\*+)\*?/,/\s+(\d{3})\s+/];
      for(let p of patterns){const m=texto.match(p);if(m){let n=m[1];if(n.includes('*'))n=n.replace(/\*+$/,'');return n.replace(/\./g,'').padStart(3,'0');}}
      return null;
  }
  function normalizarData(d){const p=d.split('/');return p.length===3?`${p[0].padStart(2,'0')}/${p[1].padStart(2,'0')}/${p[2]}`:d;}
  function extrairPeriodo(texto) {
      let t=texto.replace(/DEVENDO APRESENTAR-SE.*?EM\s+\d{1,2}\/\d{1,2}\/\d{4}/gi,'').replace(/APRESENTAR-SE.*?EM\s+\d{1,2}\/\d{1,2}\/\d{4}/gi,'')
          .replace(/COM\s+PERÍODO\s+AQUISITIVO\s+DE\s+\d{1,2}\/\d{1,2}\/\d{4}\s+A(?:TÉ)?\s+\d{1,2}\/\d{1,2}\/\d{4}/gi,'')
          .replace(/PERÍODO\s+AQUISITIVO\s+DE\s+\d{1,2}\/\d{1,2}\/\d{4}\s+A(?:TÉ)?\s+\d{1,2}\/\d{1,2}\/\d{4}/gi,'');
      const patterns=[/(?:NO\s+)?PERÍODO DE\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+A(?:TÉ)?\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,/AFASTAR-SE\s+DO\s+SERVIÇO\s+(?:DO\s+DIA\s+|NO\s+PERÍODO\s+DE\s+)?(\d{1,2}\/\d{1,2}\/\d{4})\s+A(?:TÉ)?\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,/DO DIA\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+A(?:O\s+DIA\s+|\s+)?(\d{1,2}\/\d{1,2}\/\d{4})/i,/A PARTIR DE\s+(\d{1,2}\/\d{1,2}\/\d{4})\s*¿?\s*ATÉ\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,/DE\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+A(?:TÉ)?\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,/EM\s+(\d{1,2}\/\d{1,2}\/\d{4})/i];
      for(let p of patterns){const m=t.match(p);if(m){return m[2]?`${normalizarData(m[1])} A ${normalizarData(m[2])}`:normalizarData(m[1]);}}
      return null;
  }
  function extrairTotalDias(texto) {
      const patterns=[/PERFAZENDO O TOTAL DE\s+(\d+)\s+DIA/i,/TOTAL DE\s+(\d+)\s+DIA/i,/PERFAZENDO O TOTAL DE\s+(\d+)/i,/NUM TOTAL DE\s+(\d+)\s+(?:\([^)]+\))?\s*MES/i,/TOTAL DE\s+(\d+)\s+(?:\([^)]+\))?\s*MES/i,/PERFAZENDO O TOTAL DE\s+(\d+)\s+(?:\([^)]+\))?\s*MES/i,/(?:NUM\s+)?TOTAL DE\s+(\d+)/i];
      for(let p of patterns){const m=texto.match(p);if(m){const n=parseInt(m[1]);return(p.source.includes('MES')||/MES/i.test(m[0]))?Math.round(n*30.4):n;}}
      return null;
  }
  function extrairMotivo(texto) {
      const regex=/MOTIVO:\s+([^.]+?)(?:\.|EXERCÍCIO|COM\s+PERÍODO|DEVENDO|CONFORME|$)/i;
      const match=texto.match(regex);
      if(!match)return null;
      let motivo=match[1].trim();
      const mp=motivo.match(/\(([^)]+)\)/);
      if(mp){const mg=motivo.replace(/\s*\([^)]*\)/,'').trim();const me=mp[1].trim();if(mg.includes('INTERESSE DO SERVIÇO')&&(me.includes('RECONCESSÃO')||me.includes('FÉRIAS')||me.includes('RECOMPENSA')))motivo=me;else motivo=mg;}
      motivo=motivo.replace(/\s*\([^)]*\)/g,'').replace(/,.*$/g,'').replace(/A PEDIDO\s*/gi,'').replace(/RECONCESSÃO.*$/gi,'RECONCESSÃO').replace(/FÉRIAS.*$/gi,'FÉRIAS').replace(/A TÍTULO DE RECOMPENSA.*$/gi,'A TÍTULO DE RECOMPENSA').replace(/LICENÇA ESPECIAL.*$/gi,'LICENÇA ESPECIAL').replace(/LICENÇA PARA TRATAMENTO DE SAÚDE.*$/gi,'LICENÇA PARA TRATAMENTO DE SAÚDE').replace(/LICENÇA PATERNIDADE.*$/gi,'LICENÇA PATERNIDADE').replace(/LICENÇA MATERNIDADE.*$/gi,'LICENÇA MATERNIDADE').replace(/LICENÇA PRÊMIO.*$/gi,'LICENÇA PRÊMIO').replace(/INTERESSE DO SERVIÇO\s*/gi,'INTERESSE DO SERVIÇO').replace(/DISPENSA\s+A\s+TÍTULO\s+DE\s+RECOMPENSA/gi,'A TÍTULO DE RECOMPENSA').replace(/CONCESSÃO DE FÉRIAS/gi,'FÉRIAS').replace(/^(PARA\s+|DE\s+|A\s+)?/gi,'').replace(/\s+(PRÓPRIO|PRÓPRIA)$/gi,'').trim();
      return normalizarTexto(motivo);
  }
  function extrairExercicio(texto){const m=texto.match(/EXERCÍCIO:\s*(\d{4})/i);return m?parseInt(m[1]):null;}
  function extrairAssinatura(texto){const p=texto.trim().split(/\s+/);return p.length>0?p[p.length-1]:'Assinatura não encontrada';}
  function compararValores(v1,v2,campo) {
      if(v1===null&&v2===null)return{igual:true,observacao:`${campo}: Ambos os valores não encontrados`};
      if(v1===null||v2===null){
          if(campo==='Período'||campo==='Total Dias'||campo==='Exercício'||campo==='Número ID')return{igual:true,observacao:`${campo}: Valor presente apenas em uma parte (normal)`};
          if(campo==='Nome'){const nv=v1||v2;if(nv&&nv.toString().trim().length>0)return{igual:true,observacao:`${campo}: Nome encontrado apenas em uma parte (assumindo consistência)`};return{igual:false,observacao:`${campo}: ATENÇÃO - Nome não encontrado em nenhuma das partes`};}
          return{igual:true,observacao:`${campo}: Um valor não encontrado (provavelmente normal)`};
      }
      if(campo==='Total Dias'||campo==='Número ID'){
          if(campo==='Total Dias'){const n1=parseInt(v1.toString().replace(/\D/g,'')),n2=parseInt(v2.toString().replace(/\D/g,''));const d=Math.abs(n1-n2);if(d===0)return{igual:true,observacao:`${campo}: OK (${v1} = ${v2})`};if(d<=4)return{igual:true,observacao:`${campo}: OK (${v1} ≈ ${v2} - diferença aceitável de ${d} dias)`};return{igual:false,observacao:`${campo}: DIVERGÊNCIA REAL (${n1} ≠ ${n2} - diferença de ${d} dias)`};}
          else{const a=v1.toString().replace(/\D/g,''),b=v2.toString().replace(/\D/g,'');if(a===b)return{igual:true,observacao:`${campo}: OK (${v1} = ${v2})`};if(a.startsWith(b)||b.startsWith(a))return{igual:true,observacao:`${campo}: OK (${a.length<b.length?a:b} é prefixo de ${a.length>=b.length?a:b} - número censurado)`};return{igual:false,observacao:`${campo}: DIVERGÊNCIA REAL (${a} ≠ ${b})`};}
      }
      if(campo==='Nome'){
          const nome1=v1.toString().replace(/\s+/g,' ').trim(),nome2=v2.toString().replace(/\s+/g,' ').trim();
          function normN(n){return n.replace(/SOLDADO\s+DE\s+2[ªº°]\s+CLASSE/gi,'SOLDADO').replace(/SOLDADO\s+2[ªº°]\s+CLASSE/gi,'SOLDADO').replace(/\bCB\b/gi,'CABO').replace(/1[°º]\s*SGT/gi,'1º SARGENTO').replace(/2[°º]\s*SGT/gi,'2º SARGENTO').replace(/3[°º]\s*SGT/gi,'3º SARGENTO').replace(/SUB\s+TEN/gi,'SUBTENENTE').replace(/\b(CORONEL|TENENTE\s+CORONEL|MAJOR|CAPITÃO|1º\s+TENENTE|2º\s+TENENTE|SUBTENENTE|1º\s+SARGENTO|2º\s+SARGENTO|3º\s+SARGENTO|CABO|SOLDADO)\s+PM\b/gi,'$1').replace(/\bQOPM\b/gi,'').replace(/\bQPPM\b/gi,'').replace(/\bQOA\b/gi,'').replace(/\bQOAPM\b/gi,'').replace(/\bQOSPM\b/gi,'').replace(/\s+RG\.?\*?\d*\s+/gi,' ').replace(/\s+REF\.?\s+/gi,' ').replace(/\s+R\/R\s+/gi,' ').replace(/\*\d+(?:\.\d+)?\*/g,'').replace(/X\d+X/g,'').replace(/\s+\d+\s+/g,' ').replace(/\d+(?=[A-Z])/g,'').replace(/&nbsp;/g,' ').replace(/Ã/g,'A').replace(/Õ/g,'O').replace(/Â/g,'A').replace(/Ê/g,'E').replace(/Î/g,'I').replace(/Ô/g,'O').replace(/Û/g,'U').replace(/À/g,'A').replace(/È/g,'E').replace(/Ì/g,'I').replace(/Ò/g,'O').replace(/Ù/g,'U').replace(/Á/g,'A').replace(/É/g,'E').replace(/Í/g,'I').replace(/Ó/g,'O').replace(/Ú/g,'U').replace(/Ç/g,'C').replace(/\s+/g,' ').trim().toUpperCase();}
          const n1=normN(nome1),n2=normN(nome2);
          if(n1===n2)return{igual:true,observacao:`${campo}: OK (mesmo nome, diferença apenas no formato/acentuação)`};
          if(n1.includes(n2)||n2.includes(n1))return{igual:true,observacao:`${campo}: OK (variações do mesmo nome)`};
          return{igual:false,observacao:`${campo}: DIVERGÊNCIA REAL - Nomes diferentes (${n1} ≠ ${n2})`};
      }
      if(campo==='Motivo'){
          const m1=v1.toString().toUpperCase().trim(),m2=v2.toString().toUpperCase().trim();
          if(m1===m2)return{igual:true,observacao:`${campo}: OK`};
          function mb(m){return m.replace(/\s*\([^)]*\)/g,'').replace(/,.*$/g,'').replace(/\s+CONFORME.*$/gi,'').replace(/\s+SEGUNDO.*$/gi,'').replace(/\s+DE\s+ACORDO.*$/gi,'').replace(/\s+/g,' ').trim();}
          const b1=mb(m1),b2=mb(m2);
          if(b1===b2)return{igual:true,observacao:`${campo}: OK (mesmo motivo base, detalhes extras ignorados)`};
          if(b1.includes(b2)||b2.includes(b1))return{igual:true,observacao:`${campo}: OK (variações do mesmo motivo)`};
          const sins=[['FÉRIAS','CONCESSÃO DE FÉRIAS','INTERESSE DO SERVIÇO FÉRIAS'],['RECONCESSÃO','RECONCESSÃO DE FÉRIAS','INTERESSE DO SERVIÇO RECONCESSÃO'],['A TÍTULO DE RECOMPENSA','DISPENSA A TÍTULO DE RECOMPENSA','RECOMPENSA','INTERESSE DO SERVIÇO RECOMPENSA'],['LICENÇA ESPECIAL','LIC ESPECIAL','LIC. ESPECIAL'],['LICENÇA PARA TRATAMENTO DE SAÚDE','LTS','TRATAMENTO DE SAÚDE','LICENÇA TRATAMENTO SAÚDE'],['INTERESSE DO SERVIÇO','SERVIÇO','INT. SERVIÇO']];
          for(let g of sins){if(g.some(s=>b1.includes(s))&&g.some(s=>b2.includes(s)))return{igual:true,observacao:`${campo}: OK (motivos sinônimos)`};}
          return{igual:false,observacao:`${campo}: DIVERGÊNCIA REAL - Motivos diferentes (${b1} ≠ ${b2})`};
      }
      const igual=v1.toString()===v2.toString();
      return{igual,observacao:igual?`${campo}: OK`:`${campo}: DIVERGÊNCIA REAL (${v1} ≠ ${v2})`};
  }
  function dividirBloco(textoCompleto) {
      let textoLimpo=textoCompleto.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
      let partes=textoCompleto.split('<br>');
      if(partes.length>=2){return{primeiraParte:partes[0].replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim(),segundaParte:partes.slice(1).join(' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()};}
      const p1=textoLimpo.match(/^(.*?)(O\s+(?:CORONEL|TENENTE\s+CORONEL|MAJOR|CAPITÃO|1º\s+TENENTE|2º\s+TENENTE|SUBTENENTE|1º\s+SARGENTO|2º\s+SARGENTO|3º\s+SARGENTO|CABO|SOLDADO).*?)$/i);
      if(p1&&p1[1].includes('ESTÁ AUTORIZADO'))return{primeiraParte:p1[1].trim(),segundaParte:p1[2].trim()};
      const p2=textoLimpo.match(/(.*?EXERCÍCIO:\s*\d{4}[^E]*)(.*EXERCÍCIO:\s*\d{4}.*)/i);
      if(p2)return{primeiraParte:p2[1].trim(),segundaParte:p2[2].trim()};
      const p3=textoLimpo.match(/^(.*?\.\s*)(O\s+(?:CORONEL|TENENTE\s+CORONEL|MAJOR|CAPITÃO|1º\s+TENENTE|2º\s+TENENTE|SUBTENENTE|1º\s+SARGENTO|2º\s+SARGENTO|3º\s+SARGENTO|CABO|SOLDADO).*?)$/i);
      if(p3&&p3[1].includes('ESTÁ AUTORIZADO'))return{primeiraParte:p3[1].trim(),segundaParte:p3[2].trim()};
      return{primeiraParte:textoLimpo,segundaParte:''};
  }
  function obterDataHoraAtual(){const n=new Date();return`${n.getDate().toString().padStart(2,'0')}/${(n.getMonth()+1).toString().padStart(2,'0')}/${n.getFullYear()} às ${n.getHours().toString().padStart(2,'0')}:${n.getMinutes().toString().padStart(2,'0')}:${n.getSeconds().toString().padStart(2,'0')}`;}

  const blocos=document.querySelectorAll('td[width="90%"]');
  let contador=0;
  const registrosAnalisados=[];
  const registrosComDivergencia=[];

  blocos.forEach((bloco)=>{
      const textoCompleto=bloco.innerHTML||bloco.outerHTML;
      if(!textoCompleto.includes('ESTÁ AUTORIZADO'))return;
      contador++;
      const{primeiraParte,segundaParte}=dividirBloco(textoCompleto);
      const dados1={nome:extrairNome(primeiraParte),numeroId:extrairNumeroId(primeiraParte),periodo:extrairPeriodo(primeiraParte),totalDias:extrairTotalDias(primeiraParte),motivo:extrairMotivo(primeiraParte),exercicio:extrairExercicio(primeiraParte)};
      const dados2={nome:extrairNome(segundaParte),numeroId:extrairNumeroId(segundaParte),periodo:extrairPeriodo(segundaParte),totalDias:extrairTotalDias(segundaParte),motivo:extrairMotivo(segundaParte),exercicio:extrairExercicio(segundaParte)};
      const assinatura=extrairAssinatura(segundaParte);
      const comparacoes={nome:compararValores(dados1.nome,dados2.nome,'Nome'),numeroId:compararValores(dados1.numeroId,dados2.numeroId,'Número ID'),periodo:compararValores(dados1.periodo,dados2.periodo,'Período'),totalDias:compararValores(dados1.totalDias,dados2.totalDias,'Total Dias'),motivo:compararValores(dados1.motivo,dados2.motivo,'Motivo'),exercicio:compararValores(dados1.exercicio,dados2.exercicio,'Exercício')};
      const divergenciasReais=Object.values(comparacoes).filter(c=>!c.igual);
      const temDivergencia=divergenciasReais.length>0;
      const registro={numero:contador,nomeCompleto:dados1.nome||dados2.nome||'Nome não encontrado',assinatura,temDivergencia,qtdDivergencias:divergenciasReais.length,comparacoes,dados1,dados2,primeiraParte,segundaParte};
      registrosAnalisados.push(registro);
      if(temDivergencia)registrosComDivergencia.push(registro);
  });

  const consistentes=registrosAnalisados.filter(r=>!r.temDivergencia);
  const inconsistentes=registrosAnalisados.filter(r=>r.temDivergencia);
  const taxa=registrosAnalisados.length>0?((consistentes.length/registrosAnalisados.length)*100).toFixed(1):0;

  adicionarLinha('===============================================================================');
  adicionarLinha('                  RELATÓRIO DE VERIFICAÇÃO DE DIVERGÊNCIAS');
  adicionarLinha('                         BLOCOS DE AFASTAMENTO/LICENÇAS');
  adicionarLinha('===============================================================================');
  adicionarLinha();
  adicionarLinha(`Data/Hora da Análise: ${obterDataHoraAtual()}`);
  adicionarLinha();
  adicionarLinha('===============================================================================');
  adicionarLinha('                             RESUMO ESTATÍSTICO');
  adicionarLinha('===============================================================================');
  adicionarLinha();
  adicionarLinha(`📊 Total de registros analisados: ${registrosAnalisados.length}`);
  adicionarLinha(`✅ Registros consistentes: ${consistentes.length}`);
  adicionarLinha(`❌ Registros com divergências REAIS: ${inconsistentes.length}`);
  adicionarLinha(`📈 Taxa de consistência: ${taxa}%`);
  adicionarLinha();

  if(inconsistentes.length>0){
      adicionarLinha('===============================================================================');
      adicionarLinha('                        ANÁLISE POR TIPO DE DIVERGÊNCIA');
      adicionarLinha('===============================================================================');
      adicionarLinha();
      const tipos=['nome','numeroId','periodo','totalDias','motivo','exercicio'];
      tipos.forEach(tipo=>{const c=inconsistentes.filter(r=>!r.comparacoes[tipo].igual).length;if(c>0)adicionarLinha(`🔍 ${tipo}: ${c} divergência(s)`);});
      adicionarLinha();
      adicionarLinha('===============================================================================');
      adicionarLinha('                       REGISTROS COM DIVERGÊNCIAS REAIS');
      adicionarLinha('===============================================================================');
      adicionarLinha();
      adicionarLinha('┌─────┬──────────────────────────────────────────────┬─────────┬─────────────┐');
      adicionarLinha('│ Nº  │ Nome                                         │ Problemas │ Assinatura  │');
      adicionarLinha('├─────┼──────────────────────────────────────────────┼─────────┼─────────────┤');
      inconsistentes.forEach(r=>{
          const n=r.numero.toString().padStart(3,' ');
          const nm=(r.nomeCompleto.length>45?r.nomeCompleto.substring(0,42)+'...':r.nomeCompleto).padEnd(45,' ');
          const p=r.qtdDivergencias.toString().padStart(7,' ');
          const a=(r.assinatura.length>10?r.assinatura.substring(0,10):r.assinatura).padEnd(10,' ');
          adicionarLinha(`│ ${n} │ ${nm} │ ${p} │ ${a} │`);
      });
      adicionarLinha('└─────┴──────────────────────────────────────────────┴─────────┴─────────────┘');
      adicionarLinha();
      adicionarLinha('===============================================================================');
      adicionarLinha('                      DETALHAMENTO DAS DIVERGÊNCIAS');
      adicionarLinha('===============================================================================');
      adicionarLinha();
      inconsistentes.forEach(registro=>{
          adicionarLinha(`┌─────────────────────────────────────────────────────────────────────────────┐`);
          adicionarLinha(`│ REGISTRO ${registro.numero.toString().padStart(3,'0')} - ${registro.nomeCompleto.toUpperCase().substring(0,55)}`);
          adicionarLinha(`├─────────────────────────────────────────────────────────────────────────────┤`);
          adicionarLinha(`│ Assinatura: ${registro.assinatura}`);
          adicionarLinha(`│ Quantidade de divergências encontradas: ${registro.qtdDivergencias}`);
          adicionarLinha(`├─────────────────────────────────────────────────────────────────────────────┤`);
          Object.entries(registro.comparacoes).forEach(([,comp])=>{adicionarLinha(`│ ${comp.igual?'✅':'❌'} ${comp.observacao}`);});
          if(registro.qtdDivergencias>0){
              adicionarLinha(`├─────────────────────────────────────────────────────────────────────────────┤`);
              adicionarLinha(`│ DADOS EXTRAÍDOS PARA DEBUG:`);adicionarLinha(`│`);
              adicionarLinha(`│ PRIMEIRA PARTE:`);
              adicionarLinha(`│   Nome: ${registro.dados1.nome||'Não encontrado'}`);adicionarLinha(`│   Número ID: ${registro.dados1.numeroId||'Não encontrado'}`);adicionarLinha(`│   Período: ${registro.dados1.periodo||'Não encontrado'}`);adicionarLinha(`│   Total Dias: ${registro.dados1.totalDias||'Não encontrado'}`);adicionarLinha(`│   Motivo: ${registro.dados1.motivo||'Não encontrado'}`);adicionarLinha(`│   Exercício: ${registro.dados1.exercicio||'Não encontrado'}`);adicionarLinha(`│`);
              adicionarLinha(`│ SEGUNDA PARTE:`);
              adicionarLinha(`│   Nome: ${registro.dados2.nome||'Não encontrado'}`);adicionarLinha(`│   Número ID: ${registro.dados2.numeroId||'Não encontrado'}`);adicionarLinha(`│   Período: ${registro.dados2.periodo||'Não encontrado'}`);adicionarLinha(`│   Total Dias: ${registro.dados2.totalDias||'Não encontrado'}`);adicionarLinha(`│   Motivo: ${registro.dados2.motivo||'Não encontrado'}`);adicionarLinha(`│   Exercício: ${registro.dados2.exercicio||'Não encontrado'}`);
          }
          adicionarLinha(`└─────────────────────────────────────────────────────────────────────────────┘`);adicionarLinha();
      });
  } else {
      adicionarLinha('🎉 Nenhuma divergência real encontrada! Todos os registros estão consistentes.');adicionarLinha();
  }

  adicionarLinha('===============================================================================');
  adicionarLinha('                           LISTA COMPLETA DE REGISTROS');
  adicionarLinha('===============================================================================');adicionarLinha();
  adicionarLinha('┌─────┬──────────────────────────────────────────────┬──────────┬─────────────┐');
  adicionarLinha('│ Nº  │ Nome                                         │ Status   │ Assinatura  │');
  adicionarLinha('├─────┼──────────────────────────────────────────────┼──────────┼─────────────┤');
  registrosAnalisados.forEach(r=>{
      const n=r.numero.toString().padStart(3,' ');
      const nm=(r.nomeCompleto.length>45?r.nomeCompleto.substring(0,42)+'...':r.nomeCompleto).padEnd(45,' ');
      const st=(r.temDivergencia?'❌ DIVERG':'✅ OK').padEnd(8,' ');
      const a=(r.assinatura.length>10?r.assinatura.substring(0,10):r.assinatura).padEnd(10,' ');
      adicionarLinha(`│ ${n} │ ${nm} │ ${st} │ ${a} │`);
  });
  adicionarLinha('└─────┴──────────────────────────────────────────────┴──────────┴─────────────┘');adicionarLinha();
  adicionarLinha('===============================================================================');
  adicionarLinha(`📊 RESUMO FINAL:`);
  adicionarLinha(`   • Registros analisados: ${registrosAnalisados.length}`);
  adicionarLinha(`   • Taxa de consistência: ${taxa}%`);
  adicionarLinha(`   • Divergências encontradas: ${inconsistentes.length}`);
  adicionarLinha('===============================================================================');

  return { ok: true, texto: relatorio, divergencias: inconsistentes.length, total: registrosAnalisados.length };
}

// ══════════════════════════════════════════════════════════════════════════════
//  TÓPICO 2 — TRANSFERÊNCIA DE UNIDADE
//  Script original "Script de Conferência de Transferência V5"
// ══════════════════════════════════════════════════════════════════════════════
function scriptTransferencia() {
  const todosOsElementos=Array.from(document.querySelectorAll('td, b, em, div, p'));
  let indexTopico=-1;
  for(let i=0;i<todosOsElementos.length;i++){const txt=(todosOsElementos[i].innerText||'').toUpperCase().trim();if(txt.includes('TRANSFERÊNCIA DE UNIDADE')||txt.includes('TRANSFERENCIA DE UNIDADE')){indexTopico=i;break;}}
  if(indexTopico===-1)return{ok:false,texto:'TRANSFERÊNCIA DE UNIDADE: tópico não encontrado na página.\n',divergencias:0,total:0};

  function limparNome(texto){if(!texto)return'';let t=texto.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');t=t.replace(/\b(2º|1º|3º|TENENTE|TEN|SOLDADO|SD|CABO|CB|SARGENTO|SGT|SUBTENENTE|SUB|MAJOR|MAJ|CAPITAO|CAP|CORONEL|CEL|ASPIRANTE|ASP|ALUNO|QOPM|QPPM|QPE|QPS|SBF|PMGO|PM|DE\s\dª\sCLASSE|\*\d+\*|\d+[\.\d]*)\b/gi,'').replace(/[^\w\s]/gi,'');return t.replace(/\s+/g,' ').trim();}
  function obterIdentificadores(u){if(!u)return new Set();let t=u.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/COMANDO REGIONAL/g,'CRPM').replace(/BATALHAO/g,'BPM').replace(/COMPANHIA INDEPENDENTE/g,'CIPM').replace(/POLICIA MILITAR/g,'').replace(/NAO CADASTRADO/g,'');const m=t.match(/\d+|CRPM|BPM|CIPM|CPC|CME|CPM|CPCHOQUE/g)||[];return new Set(m.map(x=>x.replace(/^0+/,'')));}
  function unidadesCorespondem(u1,u2){const a=obterIdentificadores(u1),b=obterIdentificadores(u2);if(!a.size||!b.size)return true;let n=0;b.forEach(v=>{if(a.has(v))n++;});return n>0;}

  const todasAsTabelas=Array.from(document.querySelectorAll('table'));
  const blocosTransferencia=[];
  todasAsTabelas.forEach(tabela=>{if(tabela.compareDocumentPosition(todosOsElementos[indexTopico])&Node.DOCUMENT_POSITION_PRECEDING){if((tabela.innerText||'').includes('TRANSFIRO')){const td=tabela.querySelector('td[width="90%"]')||tabela.querySelector('td');if(td&&(td.innerText||'').includes('TRANSFIRO')&&!blocosTransferencia.includes(td))blocosTransferencia.push(td);}}});

  const logs=[];
  let divergencias=0;
  blocosTransferencia.forEach((bloco,i)=>{
      const textoBase=(bloco.innerText||'').replace(/\s+/g,' ').trim();
      const divisorMatch=textoBase.match(/\d{2}\/\d{2}\/\d{4}\./);
      if(!divisorMatch)return;
      const posDivisor=divisorMatch.index+divisorMatch[0].length;
      const p1=textoBase.substring(0,posDivisor).trim();
      const p2=textoBase.substring(posDivisor).trim();
      const nomeP1Match=p1.match(/(?:TENENTE|SOLDADO|CABO|SARGENTO|MAJOR|CAPITAO|SUBTENENTE|CORONEL|TEN|SD|CB|SGT|MAJ|CAP|CEL|ASP|ALUNO).*?,\s(?:[\d\*]*),\s(.*?),\sCPF/i)||p1.match(/TRANSFIRO O .*?,\s(?:[\d\*]*),\s(.*?),\sCPF/i);
      const nomeP1=nomeP1Match?nomeP1Match[1].trim():'';
      const origemP1=p1.match(/DA\(O\)\s(.*?)\sPARA/i)?.[1]||'';
      const destinoP1=p1.match(/PARA\sA\(O\)\s(.*?)(?:,|$)/i)?.[1]||'';
      const nomeP2Match=p2.match(/TRANSFIRO O (.*?)(?:, NO INTERESSE|, POR INTERESSE|, NO INT|, NO INTERESSE| NO INTERESSE)/i);
      const nomeP2Raw=nomeP2Match?nomeP2Match[1]:'';
      const origemP2=p2.match(/(?:DO|DA)\s(.*?)\sPARA/i)?.[1]||'';
      const destinoP2=p2.match(/PARA\s(?:O|A)\s(.*?)(?:,|$|\.)/i)?.[1]||'';
      const erros=[];
      const n1=limparNome(nomeP1),n2=limparNome(nomeP2Raw);
      if(n1&&n2&&n1!==n2&&!n1.includes(n2)&&!n2.includes(n1))erros.push('NOME');
      if(!unidadesCorespondem(origemP1,origemP2))erros.push('ORIGEM');
      if(!unidadesCorespondem(destinoP1,destinoP2))erros.push('DESTINO');
      const status=erros.length===0?'✅ OK':`❌ DIVERGÊNCIA: ${erros.join(' | ')}`;
      if(erros.length>0)divergencias++;
      logs.push(`Registro ${(i+1).toString().padStart(2,'0')}: ${nomeP1||'NOME NÃO EXTRAÍDO'} - ${status}`);
  });

  const relatorioTxt=`RELATÓRIO DE CONFERÊNCIA (V5 - INTERSEÇÃO)\nGerado em: ${new Date().toLocaleString()}\n${'='.repeat(60)}\n`+logs.join('\n')+'\n';
  return{ok:true,texto:relatorioTxt,divergencias,total:blocosTransferencia.length};
}

// ══════════════════════════════════════════════════════════════════════════════
//  TÓPICO 3 — PERÍODO AQUISITIVO
//  Script original "Script para conferir_AQUISITIVO_NOVO"
// ══════════════════════════════════════════════════════════════════════════════
function scriptAquisitivo() {
  let relatorioTxt='';
  const agora=new Date();
  const limite60Dias=new Date();limite60Dias.setDate(agora.getDate()+60);
  function adicionarLinhaTxt(l){relatorioTxt+=l+'\n';}
  function normalizarTexto(texto){if(typeof texto!=='string')return'';return texto.replace(/\u00A0/g,' ').trim().toUpperCase().replace(/\s+/g,' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
  function parseData(dataStr){const p=dataStr.split('/');if(p.length!==3)return null;return new Date(p[2],p[1]-1,p[0]);}
  function extrairDados(){
      const blocos=document.querySelectorAll('td[width="90%"]');
      const registros=[];let index=1;
      const regexAssinatura=/(O\(A\)|O)\s+(.*?)\s+ESTÁ\s+AUTORIZADO/i;
      const regexPeriodo=/PERÍODO\s+AQUISITIVO\s+DE\s*(\d{2}\/\d{2}\/\d{4})\s*A\s*(\d{2}\/\d{2}\/\d{4})/i;
      const regexExercicio=/EXERCÍCIO:\s*(\d{4})/i;
      blocos.forEach(bloco=>{
          try{
              const textoCompleto=bloco.textContent||'';
              const mA=textoCompleto.match(regexAssinatura);const assinaturaCompleta=mA?mA[2].trim():'ASSINATURA-NA';
              const nomeCompleto=assinaturaCompleta.replace(/(CAPITÃO|MAJOR|TENENTE|CORONEL|SARGENTO|CABO|SOLDADO|SD|CB|SGT|TEN|CEL|MAJ)\s*[\*\d\.\s]+/i,'').trim();
              const mP=textoCompleto.match(regexPeriodo);const dataInicioStr=mP?mP[1]:null;const dataFimStr=mP?mP[2]:null;
              const mE=textoCompleto.match(regexExercicio);const exercicioAno=mE?mE[1].trim():'ANO-NA';
              registros.push({numero:index,nomeCompleto,assinatura:normalizarTexto(assinaturaCompleta),periodoOriginal:mP?mP[0]:'NÃO ENCONTRADO',dataInicio:dataInicioStr?parseData(dataInicioStr):null,dataFim:dataFimStr?parseData(dataFimStr):null,dataFimStr,exercicioAno,anoAquisitivoInicio:dataInicioStr?dataInicioStr.split('/')[2]:'ANO-NA'});
              index++;
          }catch(e){}
      });
      return registros;
  }
  const registros=extrairDados();
  const mapa={};registros.forEach(r=>{if(r.assinatura!=='ASSINATURA-NA'){if(!mapa[r.assinatura])mapa[r.assinatura]=[];mapa[r.assinatura].push(r);}});
  const divergenciasDuplicatas=[];Object.values(mapa).filter(g=>g.length>1).forEach(grupo=>{const primeiro=grupo[0].periodoOriginal;if(grupo.some(reg=>reg.periodoOriginal!==primeiro))divergenciasDuplicatas.push(grupo);});
  const incoerenciasExercicio=registros.filter(r=>r.exercicioAno!=='ANO-NA'&&r.anoAquisitivoInicio!=='ANO-NA'&&r.exercicioAno!==r.anoAquisitivoInicio);
  const prazosExcedidos=registros.filter(r=>r.dataFim&&r.dataFim>limite60Dias);
  const sep='-'.repeat(70);
  adicionarLinhaTxt('=== RELATÓRIO DE CONFERÊNCIA: AQUISITIVO, INCOERÊNCIAS E PRAZOS FUTUROS ===');
  adicionarLinhaTxt(`Data da Conferência: ${agora.toLocaleString('pt-BR')}`);
  adicionarLinhaTxt(`Data Limite (Hoje + 60 dias): ${limite60Dias.toLocaleDateString('pt-BR')}`);
  adicionarLinhaTxt('\n[1] DIVERGÊNCIAS EM DUPLICATAS');
  if(divergenciasDuplicatas.length>0){divergenciasDuplicatas.forEach(g=>{adicionarLinhaTxt(`Chave: ${g[0].assinatura}`);g.forEach(r=>adicionarLinhaTxt(`  - Registro ${r.numero}: ${r.periodoOriginal}`));});}
  else adicionarLinhaTxt('Nenhuma divergência encontrada.');
  adicionarLinhaTxt('\n'+sep+'\n[2] INCOERÊNCIA: EXERCÍCIO VS INÍCIO AQUISITIVO');
  if(incoerenciasExercicio.length>0)incoerenciasExercicio.forEach(r=>adicionarLinhaTxt(`Registro ${r.numero} (${r.nomeCompleto}): Exercício ${r.exercicioAno} != Início Aquisitivo ${r.anoAquisitivoInicio}`));
  else adicionarLinhaTxt('Nenhuma incoerência encontrada.');
  adicionarLinhaTxt('\n'+sep+'\n[3] ALERTA: PERÍODO AQUISITIVO COM FIM SUPERIOR A 60 DIAS DA DATA ATUAL');
  if(prazosExcedidos.length>0)prazosExcedidos.forEach(r=>{const d=Math.floor((r.dataFim-agora)/(1000*60*60*24));adicionarLinhaTxt(`Registro ${r.numero} (${r.nomeCompleto}): Data Fim ${r.dataFimStr} (${d} dias à frente)`);});
  else adicionarLinhaTxt('Nenhum registro encontrado com esta condição.');
  const totalProblemas=divergenciasDuplicatas.length+incoerenciasExercicio.length+prazosExcedidos.length;
  return{ok:true,texto:relatorioTxt,divergencias:divergenciasDuplicatas.length+incoerenciasExercicio.length,alertas:prazosExcedidos.length,total:registros.length};
}


// ══════════════════════════════════════════════════════════════════════════════
//  TÓPICO 4 — SUSPENSÕES DE AFASTAMENTO
//  Script original "Script para conferir_SUSPENSOES_EXCLUSIVO" — ÍNTEGRO
//  Única modificação permitida: suprime download e retorna { ok, texto, divergencias, total }
// ══════════════════════════════════════════════════════════════════════════════
function scriptSuspensoes() {

    // Regex original — NÃO ALTERAR
    const regex = /O AFASTAMENTO FÉRIAS EXERCÍCIO (\d{4}), DO (.*?) \*(\d{3}[\.\d]*)\* (.*?) COM PERÍODO ENTRE (\d{2}\/\d{2}\/\d{4}) A (\d{2}\/\d{2}\/\d{4}) TOTALIZANDO (\d+) DIAS,\s+FICA SUSPENSO\s+A CONTAR DE (\d{2}\/\d{2}\/\d{4})\. MOTIVO RELATADO: (.*)/s;

    const todosBlocosAzuis = document.querySelectorAll('table.frm-borda[bgcolor="#99ccff"]');

    const blocosSuspensao = Array.from(todosBlocosAzuis).filter(tabela => {
        const content = tabela.textContent || '';
        return content.includes('FICA SUSPENSO');
    });

    if (blocosSuspensao.length === 0) {
        return { ok: false, texto: 'SUSPENSÕES: nenhum bloco "FICA SUSPENSO" encontrado na página.\n', divergencias: 0, total: 0 };
    }

    const registrosComInconsistencia = [];

    function parseDate(dateString) {
        const parts = dateString.split('/');
        const date = new Date(parts[2], parts[1] - 1, parts[0]);
        if (date.getFullYear() != parts[2] || date.getMonth() != parts[1] - 1 || date.getDate() != parts[0]) {
            return null;
        }
        return date;
    }

    function calculateDays(start, end) {
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays + 1;
    }

    function normalizarMotivo(motivo) {
        if (typeof motivo !== 'string') return '';
        return motivo.toUpperCase().trim().replace(/[., ]*$/, '').replace(/\s+/g, ' ');
    }

    function findMotives(text) {
        const motiveRegex = /(?:MOTIVO RELATADO|MOTIVO DA SUSPENSÃO|MOTIVO):\s*([^\n\r.]+?)(?=\.|\s*(?:GOIÂNIA|ITEM DOPM|PROCESSO SEI|PM\/CH\.GAB\.CMT)|$|\s*(?:MOTIVO RELATADO|MOTIVO DA SUSPENSÃO|MOTIVO):)/gi;
        const motives = [];
        let match;
        while ((match = motiveRegex.exec(text)) !== null) {
            motives.push(match[1].trim());
        }
        return motives;
    }

    // === 1. ETAPA DE EXTRAÇÃO E VALIDAÇÃO ===
    blocosSuspensao.forEach((tabela, index) => {
        const registro = { index: index + 1, inconsistencias: [], raw: {} };
        let isInconsistent = false;

        try {
            const celulaConteudo = tabela.querySelector('td[width="90%"]');
            if (!celulaConteudo) {
                registro.inconsistencias.push('Falha estrutural: Célula de conteúdo (width="90%") não encontrada.');
                registrosComInconsistencia.push(registro);
                return;
            }

            const fullText = celulaConteudo.textContent;
            const allLines = fullText.trim().split('\n').filter(l => l.trim().length > 0);
            registro.raw.textoCompleto = allLines.join(' | ');

            const textoConteudo = allLines[0] || '';
            const match = textoConteudo.match(regex);

            // 1. VERIFICAÇÃO DE DATAS E EXTRAÇÃO PRIMÁRIA
            if (!match) {
                registro.inconsistencias.push('Falha na extração (Regex): O bloco não segue o padrão de texto principal esperado na primeira linha.');
                isInconsistent = true;
            } else {
                const [, exercicio, posto, numero, nome, dtInicioStr, dtFimStr, diasInformadosStr, dtSuspensaoStr, motivo] = match;

                registro.raw = { ...registro.raw, posto, numero, nome, dtInicioStr, dtFimStr, diasInformadosStr, dtSuspensaoStr, motivo };
                registro.nomeCompleto = `${posto.trim()} ${nome.trim()}`;

                const dtInicio = parseDate(dtInicioStr);
                const dtFim = parseDate(dtFimStr);
                const dtSuspensao = parseDate(dtSuspensaoStr);
                const diasInformados = parseInt(diasInformadosStr, 10);

                if (!dtInicio || !dtFim || !dtSuspensao) {
                    registro.inconsistencias.push('Falha de conversão de data: Pelo menos uma data (Início/Fim/Suspensão) está em formato inválido.');
                    isInconsistent = true;
                }

                // 1.2 Coerência Temporal
                if (dtSuspensao && dtInicio && dtSuspensao > dtInicio) {
                    registro.inconsistencias.push(`Incoerência temporal: Data da Suspensão (${dtSuspensaoStr}) é POSTERIOR ao Início das Férias (${dtInicioStr}).`);
                    isInconsistent = true;
                }

                // 1.3 Divergência de Duração
                if (dtInicio && dtFim) {
                    const diasCalculados = calculateDays(dtInicio, dtFim);
                    if (diasCalculados !== diasInformados) {
                        registro.inconsistencias.push(`Divergência de duração: Período (${dtInicioStr} a ${dtFimStr}) tem ${diasCalculados} dias, mas o texto informa ${diasInformados} dias.`);
                        isInconsistent = true;
                    }
                }
            }

            // 2. VERIFICAÇÃO DE COERÊNCIA DO MOTIVO
            const allMotives = findMotives(fullText);

            if (allMotives.length >= 2) {
                const motivoNormalizado1 = normalizarMotivo(allMotives[0]);
                for (let i = 1; i < allMotives.length; i++) {
                    const motivoN = allMotives[i];
                    const motivoNormalizadoN = normalizarMotivo(motivoN);
                    if (motivoNormalizado1 !== motivoNormalizadoN) {
                        isInconsistent = true;
                        registro.inconsistencias.push(`Divergência de Motivo (Ocorrência ${i + 1}): O primeiro motivo ("${allMotives[0]}") é diferente do motivo subsequente ("${motivoN}").`);
                    }
                }
            } else if (allMotives.length === 0 && match) {
                registro.inconsistencias.push('Falha de extração: Nenhuma ocorrência do padrão "MOTIVO:" ou "MOTIVO RELATADO:" foi encontrada no bloco.');
                isInconsistent = true;
            }

            if (isInconsistent) {
                registrosComInconsistencia.push(registro);
            }

        } catch (e) {
            registro.inconsistencias.push(`Erro inesperado no bloco: ${e.message}`);
            registrosComInconsistencia.push(registro);
        }
    });

    // === 2. ETAPA DE GERAÇÃO DO RELATÓRIO TXT ===
    const totalInconsistencias = registrosComInconsistencia.length;
    let relatorioTexto = `RELATÓRIO DE INCONSISTÊNCIAS (DATAS E COERÊNCIA DO MOTIVO)\n`;
    relatorioTexto += `Data da Geração: ${new Date().toLocaleString('pt-BR')}\n`;
    relatorioTexto += `Total de Blocos Azuis (Suspensão) Encontrados: ${blocosSuspensao.length}\n`;
    relatorioTexto += `Total de Problemas Encontrados: ${totalInconsistencias}\n`;
    relatorioTexto += '========================================================================\n\n';

    if (totalInconsistencias === 0) {
        relatorioTexto += 'NENHUMA INCONSISTÊNCIA DE DATA OU MOTIVO ENCONTRADA. TODOS OS REGISTROS DE SUSPENSÃO ESTÃO COERENTES.';
    } else {
        registrosComInconsistencia.forEach((r, i) => {
            relatorioTexto += `🚨 [PROBLEMA ${i + 1} / Bloco #${r.index}] - ${r.nomeCompleto || 'REGISTRO C/ FALHA DE EXTRAÇÃO'}\n`;
            if (r.raw.dtInicioStr) {
                relatorioTexto += `  Dados Primários: Férias de ${r.raw.dtInicioStr} a ${r.raw.dtFimStr} (${r.raw.diasInformadosStr} dias). Suspensão a partir de ${r.raw.dtSuspensaoStr}.\n`;
                relatorioTexto += `  MOTIVO PRIMÁRIO (Capturado na 1ª linha): ${r.raw.motivo}\n`;
            } else {
                relatorioTexto += `  Texto do Bloco (Resumo): ${r.raw.textoCompleto || 'Não capturado'}\n`;
            }
            relatorioTexto += '  INCONSISTÊNCIA(S) DETECTADA(S):\n';
            r.inconsistencias.forEach(inc => {
                relatorioTexto += `    > ${inc}\n`;
            });
            relatorioTexto += '------------------------------------------------------------------------\n';
        });
    }

    return { ok: true, texto: relatorioTexto, divergencias: totalInconsistencias, total: blocosSuspensao.length };
}

// ══════════════════════════════════════════════════════════════════════════════
//  ORQUESTRADOR
// ══════════════════════════════════════════════════════════════════════════════
document.getElementById('btnRun').addEventListener('click', async () => {
  if (running) return;
  running = true;
  resetUI();

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url   = tab?.url || '';
  const ok    = url.includes('sei.go.gov.br') || url.includes('sisp.ssp.go.gov.br');

  if (!ok) {
    document.getElementById('warnBox').classList.add('show');
    setStatus('Acesse um site compatível primeiro.', 'err');
    running = false;
    return;
  }
  document.getElementById('warnBox').classList.remove('show');

  const btn = document.getElementById('btnRun');
  btn.disabled = true;
  btn.textContent = '⏳ Executando…';

  const scripts = [
    { id: 's1', fn: scriptAfastamentos,  label: 'Afastamentos'    },
    { id: 's2', fn: scriptTransferencia, label: 'Transferências'  },
    { id: 's3', fn: scriptAquisitivo,    label: 'Aquisitivo'      },
    { id: 's4', fn: scriptSuspensoes,    label: 'Suspensões'      }
  ];

  const titulosSec = [
    '████████████████████  TÓPICO 1 — AFASTAMENTOS / LICENÇAS  ████████████████████',
    '████████████████████  TÓPICO 2 — TRANSFERÊNCIA DE UNIDADE  ███████████████████',
    '████████████████████  TÓPICO 3 — PERÍODO AQUISITIVO  ███████████████████████',
    '████████████████████  TÓPICO 4 — SUSPENSÕES DE AFASTAMENTO  ████████████████'
  ];

  const partes = [];

  for (let i = 0; i < scripts.length; i++) {
    const { id, fn, label } = scripts[i];
    setState(id, 'run', 'Executando…');
    setStatus(`Executando: ${label}…`);
    setProgress(i, scripts.length);

    const res = await inject(tab.id, fn);

    if (!res.ok) {
      setState(id, 'skip', 'N/A');
      partes.push(titulosSec[i] + '\n\n' + (res.texto || 'Módulo não aplicável nesta página.') + '\n');
    } else {
      const divs = (res.divergencias || 0) + (res.alertas || 0);
      if (divs > 0)  setState(id, 'err',  `${divs} problema(s)`);
      else           setState(id, 'ok',   '✓ OK');
      partes.push(titulosSec[i] + '\n\n' + res.texto + '\n');
    }
  }

  setProgress(scripts.length, scripts.length);

  // Monta relatório final unificado
  const agora = new Date().toLocaleString('pt-BR');
  const cabecalho =
    '╔══════════════════════════════════════════════════════════════════════════════╗\n' +
    '║       RELATÓRIO UNIFICADO DE CONFERÊNCIA — DOPM / PMGO — v2.0             ║\n' +
    '╚══════════════════════════════════════════════════════════════════════════════╝\n' +
    `  Gerado em : ${agora}\n` +
    `  Página    : ${url}\n` +
    `  Tópicos   : Afastamentos · Transferência · Aquisitivo · Suspensões\n\n`;

  relatorio = cabecalho + partes.join('\n' + '─'.repeat(80) + '\n\n');

  const totalDivs = partes.length; // just for UI summary
  setStatus('Conferência concluída! Clique em ⬇ para baixar o relatório.', 'ok');
  document.getElementById('btnDl').disabled = false;
  btn.disabled = false;
  btn.textContent = '▶ Executar Conferência Completa';
  running = false;
});

document.getElementById('btnDl').addEventListener('click', () => {
  if (!relatorio) return;
  const blob = new Blob([relatorio], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `Conferencia_DOPM_Unificado_${new Date().toISOString().slice(0,10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
});
