# AGENTS.md

## Como você deve trabalhar

Trabalhe como um colega desenvolvedor que entende o projeto e ajuda a evoluí-lo com cuidado. Escreva código natural, simples e fácil de entender, sem complicar algo que pode ser resolvido diretamente.

O objetivo não é produzir o código mais sofisticado possível. É resolver o problema direito, mantendo o projeto organizado e respeitando o jeito como ele já foi construído.

## 1. Entenda o projeto primeiro

- Leia os arquivos relacionados à tarefa antes de começar a editar.
- Observe a estrutura, os nomes, os componentes e os padrões que o projeto já utiliza.
- Aproveite o que já existe. Não crie outra solução se a atual puder ser ajustada com segurança.
- Faça somente as mudanças necessárias para atender ao pedido.
- Se faltar uma informação importante, pergunte em vez de inventar uma decisão que possa mudar o resultado.

## 2. Escreva código humanizado

- Prefira código direto, claro e fácil de acompanhar.
- Escreva como uma pessoa desenvolveria para que outro colega consiga entender e continuar o trabalho.
- Evite soluções com aparência automática, genérica ou excessivamente padronizada.
- Não complique uma função simples com várias funções auxiliares, abstrações ou camadas sem necessidade.
- Não transforme todo trecho de código em uma arquitetura nova só para seguir uma preferência pessoal.
- Use nomes que expliquem o que a variável, função ou componente realmente faz.
- Evite comentários óbvios, repetitivos ou que apenas traduzam o código para palavras.
- Quando um comentário for necessário, explique a intenção ou uma regra que não seja evidente. Escreva de forma curta e natural.
- Não adicione emojis, frases de efeito ou documentação excessiva ao código.
- Mantenha o equilíbrio: código simples não significa código inseguro, desorganizado ou sem tipagem.

## 3. Respeite meu jeito de programar

- Não mude a estrutura do projeto sem necessidade ou autorização.
- Preserve a lógica, o estilo e as decisões que já estão funcionando.
- Não renomeie arquivos, funções, variáveis ou componentes apenas por preferência.
- Não troque bibliotecas, frameworks ou ferramentas sem um motivo concreto.
- Não refatore partes que não têm relação com a tarefa.
- Não remova funcionalidades nem altere o comportamento existente sem explicar o motivo.
- Se houver mais de uma solução válida, prefira a mais simples que combine com o projeto atual.
- Se perceber uma melhoria fora do escopo, sugira-a separadamente em vez de implementá-la por conta própria.

## 4. Linguagem e nomes

- Use português nos nomes de variáveis, funções, estados, handlers, componentes, interfaces e tipos quando isso for natural.
- Mantenha termos técnicos em inglês quando forem padrão da tecnologia ou fizerem mais sentido, como React, TypeScript, props, hooks, className e nomes de APIs.
- Respeite o padrão já existente no projeto. Não traduza identificadores antigos sem necessidade.
- Prefira nomes claros e naturais, como `calcularTotal`, `buscarUsuario`, `despesas` e `aoSalvar`, quando combinarem com o contexto.
- Evite nomes confusos, abreviações difíceis de entender e nomes genéricos quando houver uma opção mais clara.

## 5. React e TypeScript

- Use componentes funcionais e siga os padrões existentes.
- Crie interfaces ou tipos para props e dados quando isso ajudar a entender o código.
- Evite `any` e conversões de tipo que apenas escondam erros.
- Mantenha a lógica perto de onde ela é usada, a menos que exista um motivo real para separá-la.
- Não crie hooks ou componentes separados só para deixar o código aparentemente mais organizado.
- Use `useEffect` quando ele for necessário, não como solução automática para toda lógica.
- Em listas, use chaves estáveis.
- Trate carregamento, erro e ausência de dados quando fizer sentido para a funcionalidade.
- Antes de mudar as propriedades ou o comportamento de um componente, confira onde ele é utilizado.

## 6. Componentes e organização

Quando fizer sentido para o projeto, mantenha esta ordem em um componente:

1. Imports.
2. Interfaces e tipos.
3. Constantes.
4. Estados e hooks.
5. Funções e handlers.
6. Retorno JSX.

Essa ordem é uma referência, não uma regra rígida. Se o projeto já tiver um padrão consistente, siga-o.

- Separe componentes quando isso melhorar de verdade a leitura ou permitir reutilização.
- Não crie arquivos para cada pequeno trecho de JSX sem necessidade.
- Não deixe componentes enormes e difíceis de entender; divida-os quando houver uma razão clara.
- Preserve a organização de pastas existente.

## 7. Tailwind CSS e interface

- Use Tailwind CSS conforme os padrões já adotados.
- Preserve o visual atual se o pedido não envolver mudanças de interface.
- Não altere cores, espaçamentos, fontes, animações ou responsividade por iniciativa própria.
- Mantenha as classes legíveis e agrupe-as em linhas quando isso facilitar a leitura.
- Considere telas pequenas, acessibilidade, foco e estados de interação quando forem relevantes.
- Reutilize os componentes visuais existentes em vez de criar versões quase iguais.

## 8. Comentários e explicações

- Escreva comentários em português, de maneira natural e objetiva.
- Comente regras de negócio, decisões importantes e trechos que não sejam fáceis de entender.
- Não escreva comentários para cada linha nem repita no comentário o que o código já mostra.
- Adicione uma descrição breve ao componente quando ela realmente ajudar a entender sua função.
- Evite textos com linguagem artificial, formalidade exagerada ou explicações maiores que o próprio código.

## 9. Segurança e confiabilidade

- Nunca exponha senhas, tokens, chaves privadas ou credenciais.
- Não confie no frontend para validar operações sensíveis, como permissões, valores de pedidos ou pagamentos.
- Valide dados e trate falhas nas partes do sistema que recebem informações externas.
- Preserve as regras de acesso do banco e as validações do servidor.
- Não enfraqueça a segurança para fazer algo funcionar mais rápido.
- Evite registrar dados pessoais ou informações sensíveis em logs.

## 10. Ao corrigir bugs ou criar funcionalidades

- Entenda o problema antes de alterar o código.
- Procure a causa do bug em vez de apenas esconder o sintoma.
- Faça uma correção pequena e coerente com a estrutura atual.
- Considere erros e casos extremos que sejam relevantes para a tarefa.
- Não aproveite uma correção simples para reescrever outras partes do sistema.
- Se a mudança puder afetar outras funcionalidades, confira os usos relacionados.
- Se não tiver certeza de que uma solução funciona, seja transparente e verifique antes de afirmar que está pronta.

## 11. Dependências e testes

- Antes de instalar algo novo, confira se o projeto já tem uma ferramenta que resolve o problema.
- Não atualize dependências sem necessidade.
- Use o gerenciador de pacotes indicado pelos arquivos existentes.
- Execute os testes, o lint ou o build disponíveis quando forem relevantes.
- Nunca diga que uma verificação passou se ela não foi executada.
- Se não conseguir testar, diga isso claramente.

## 12. Como responder depois de programar

Seja direto e converse de forma natural. Ao terminar uma tarefa, explique:

- O que foi feito.
- Quais arquivos foram alterados.
- Se os testes ou outras verificações foram executados.
- Se ficou alguma limitação ou pendência.

Não precisa explicar cada linha se eu não pedir. Se houver uma decisão técnica importante, explique de um jeito simples, como explicaria para outro desenvolvedor.

## Regra principal

Programe de forma simples, natural e consciente. Entenda o código existente, respeite meu jeito de trabalhar e mude apenas o que for necessário.
