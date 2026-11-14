import Link from 'next/link';
import Icon from '../Icon';
import { TERMO_VERSAO } from '@/lib/util';

export const metadata = { title: 'Privacidade', description: 'Como o NEXTFIT trata os seus dados.' };

// Texto da política (versão TERMO_VERSAO). Ao mudar o conteúdo de forma relevante, suba TERMO_VERSAO em lib/util.ts:
// todos os alunos aceitam o termo de novo no próximo acesso.
export default function Privacidade() {
  return (
    <div className="app">
      <main className="screen doc">
        <header className="top">
          <Link className="ibtn" href="/" aria-label="Voltar"><Icon name="left" /></Link>
          <div className="grow"><h1>Privacidade</h1><p>Como o NEXTFIT trata os seus dados · versão {TERMO_VERSAO}</p></div>
        </header>

        <section className="panel">
          <h2>Em poucas palavras</h2>
          <ul>
            <li>O app guarda os dados do seu treino para o <b>seu professor</b> montar e acompanhar o seu treino com segurança.</li>
            <li>Só o seu professor vê os seus dados de treino e saúde. O responsável pelo app vê apenas o seu nome e quando você treinou. Nada é vendido nem usado para propaganda.</li>
            <li>Você pode baixar os seus dados ou pedir para apagá-los quando quiser.</li>
            <li>Menores de 18 anos só usam o app com autorização do responsável.</li>
          </ul>
        </section>

        <section className="panel">
          <h2>Quem cuida dos seus dados</h2>
          <p>O responsável pelos seus dados é o <b>professor que montou o seu treino</b> e cadastrou você no app. Dúvidas ou pedidos sobre os seus dados podem ser feitos diretamente a ele.</p>
          <p>O <b>professor responsável pelo app</b>, que administra os professores cadastrados, vê apenas a lista de alunos de cada professor: o seu <b>nome</b>, a data do seu <b>último treino</b> e se você já aceitou este termo. Ele <b>não</b> vê seus treinos, cargas, sintomas nem avaliações.</p>
        </section>

        <section className="panel">
          <h2>Quais dados o app guarda</h2>
          <ul>
            <li><b>Cadastro:</b> nome, idade, peso, altura, objetivo e observações ou limitações informadas ao professor.</li>
            <li><b>Treino:</b> exercícios, séries, cargas, repetições e os dias em que você treinou.</li>
            <li><b>Retorno após o treino:</b> o esforço que você informou (0 a 10) e sintomas como dor, tontura, falta de ar ou mal-estar, com o comentário que você escrever.</li>
            <li><b>Avaliação física:</b> peso, percentual de gordura e medidas registradas pelo professor.</li>
            <li><b>Termo:</b> a data em que você aceitou este termo e, para menores de 18 anos, o nome do responsável que autorizou.</li>
          </ul>
          <p>Dados como peso, medidas e sintomas são <b>dados de saúde</b>, considerados sensíveis pela Lei Geral de Proteção de Dados (Lei 13.709/2018). Por isso o app só os guarda com o seu consentimento.</p>
        </section>

        <section className="panel">
          <h2>Para que eles são usados</h2>
          <p>Somente para montar, ajustar e acompanhar o seu treino: ver a sua evolução de carga e de medidas, ajustar a intensidade e perceber sinais de que algo não vai bem (como dor ou tontura relatadas após o treino).</p>
        </section>

        <section className="panel">
          <h2>Onde ficam guardados</h2>
          <p>Os dados ficam em serviços de nuvem contratados para o funcionamento do app: <b>Vercel</b> (hospedagem), <b>Neon</b> (banco de dados) e <b>Resend</b> (envio de e-mails da área do professor). Esses serviços podem manter os dados em servidores fora do Brasil.</p>
          <p>Para o treino funcionar sem internet, uma cópia do seu treino fica guardada no seu celular. Ela é apagada quando você toca em <b>Sair</b>.</p>
        </section>

        <section className="panel">
          <h2>Por quanto tempo</h2>
          <p>Enquanto você estiver em acompanhamento com o seu professor. Quando você pedir a exclusão, ou quando o professor encerrar o seu cadastro, os seus dados são apagados do app.</p>
        </section>

        <section className="panel">
          <h2>Seus direitos</h2>
          <ul>
            <li><b>Ver e baixar</b> os seus dados: no app, em <b>Meus dados e privacidade</b> → <b>Baixar meus dados</b>.</li>
            <li><b>Corrigir</b> dados errados: peça ao seu professor.</li>
            <li><b>Pedir a exclusão</b> e retirar o consentimento: no app, em <b>Meus dados e privacidade</b> → <b>Pedir exclusão dos meus dados</b>. O seu professor recebe o pedido e apaga o seu cadastro.</li>
          </ul>
        </section>

        <section className="panel">
          <h2>Menores de 18 anos</h2>
          <p>O app aceita alunos a partir de 12 anos, idade em que as academias costumam liberar o treino. Para menores de 18 anos, o termo precisa ser aceito com a autorização de um dos pais ou do responsável legal, que informa o próprio nome no primeiro acesso.</p>
        </section>
      </main>
    </div>
  );
}
