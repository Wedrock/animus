# AGENTS.md

## Objetivo

Escrever código o mais próximo possível da forma como um desenvolvedor humano trabalharia em um projeto real. O código deve ser natural, simples, coerente com o contexto e fácil de entender e manter.

## 1. Entenda antes de programar

- Leia os arquivos relacionados à tarefa antes de fazer alterações.
- Entenda a estrutura do projeto e os padrões que já estão sendo utilizados.
- Identifique o problema real antes de propor uma solução.
- Reaproveite o código existente sempre que fizer sentido.
- Se faltar alguma informação essencial, pergunte antes de tomar decisões importantes.

## 2. Escreva código natural

- Priorize clareza, simplicidade e legibilidade.
- Escreva código como alguém que realmente precisa manter esse projeto no futuro.
- Evite soluções genéricas, abstrações desnecessárias e estruturas excessivamente complexas.
- Não crie várias funções para resolver algo que pode ser resolvido de forma simples.
- Não adicione comentários em todas as linhas.
- Comente apenas quando precisar explicar uma regra, uma decisão ou algo que não seja evidente.
- Evite nomes artificiais, funções genéricas demais e padrões repetitivos sem necessidade.
- Não tente deixar o código sofisticado apenas para demonstrar conhecimento.
- Não simplifique a ponto de prejudicar a segurança, a tipagem ou a manutenção.

## 3. Respeite o estilo do projeto

- Preserve a estrutura e a arquitetura existentes.
- Não reescreva arquivos inteiros quando uma pequena alteração for suficiente.
- Não refatore partes que não tenham relação com a tarefa.
- Não troque bibliotecas ou tecnologias sem uma justificativa concreta.
- Mantenha os padrões de nomenclatura já utilizados.
- Se houver mais de uma solução adequada, escolha a mais simples e coerente com o projeto.

## 4. Nomenclatura

- Prefira nomes em português para variáveis, funções, estados, componentes e interfaces quando isso for natural.
- Mantenha termos técnicos em inglês quando forem padrão da tecnologia.
- Use nomes que expliquem a intenção do código.
- Evite abreviações confusas e nomes genéricos quando houver alternativas mais claras.
- Não renomeie identificadores existentes sem necessidade.

## 5. React e TypeScript

- Utilize componentes funcionais e siga os padrões do projeto.
- Crie interfaces e tipos para props e dados quando isso ajudar na compreensão.
- Evite `any` e conversões de tipo desnecessárias.
- Não crie hooks, componentes ou arquivos separados sem um motivo real.
- Utilize `useEffect` apenas quando necessário.
- Mantenha a lógica próxima de onde ela é utilizada, salvo quando a separação melhorar a organização.
- Preserve os contratos e comportamentos dos componentes existentes.

## 6. Tailwind CSS

- Siga os padrões visuais já existentes.
- Preserve cores, espaçamentos, tipografia e responsividade, exceto quando houver pedido de alteração.
- Reutilize componentes e estilos existentes.
- Organize as classes para facilitar a leitura.
- Não altere o design por iniciativa própria.

## 7. Correções e novas funcionalidades

- Investigue a causa do problema antes de corrigir.
- Faça alterações pequenas e direcionadas.
- Não esconda erros com soluções temporárias frágeis.
- Considere os casos de erro relevantes para a funcionalidade.
- Verifique se a alteração afeta outras partes do sistema.
- Não implemente funcionalidades que não foram solicitadas.

## 8. Segurança e qualidade

- Nunca exponha senhas, tokens ou credenciais.
- Não confie no frontend para validar operações sensíveis.
- Preserve as regras de acesso e as validações do servidor.
- Evite dependências desnecessárias.
- Execute testes, lint e build quando disponíveis e relevantes.
- Nunca afirme que algo foi testado se não foi.

## 9. Comunicação

- Converse de forma natural, direta e objetiva.
- Explique as decisões técnicas com palavras simples.
- Ao concluir, informe o que foi alterado e quais verificações foram executadas.
- Não explique cada linha de código, a menos que isso seja solicitado.
- Informe claramente quando algo não puder ser verificado.

## Regra principal

Escreva código como um desenvolvedor humano trabalhando em um projeto real: entenda o contexto, respeite o que já existe, escolha soluções simples e faça apenas as mudanças necessárias. Priorize clareza, consistência e manutenção, sem complexidade artificial.
