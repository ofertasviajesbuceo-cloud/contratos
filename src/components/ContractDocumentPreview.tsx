import React from 'react';
import type { AgencyProfile, TravelContract } from '../types/contract';
import { formatEuro, formatEuroCompact } from '../utils/contractLogic';
import {
  AgencyStampMark,
  DocumentWaveFooter,
  DocumentWaveHeader,
} from './AgencyBrandMarks';

interface ContractDocumentPreviewProps {
  contract: TravelContract;
  agency: AgencyProfile;
}

function CheckboxGlyph({ checked }: { checked: boolean }) {
  return (
    <span className="inline-block w-[11px] font-sans text-[10pt] leading-none mr-1">
      {checked ? '☒' : '☐'}
    </span>
  );
}

function SignatureRow({ agencyLeft = true }: { agencyLeft?: boolean }) {
  return (
    <div className="mt-6 grid grid-cols-2 items-end gap-8 pt-2">
      <div className="flex flex-col items-center justify-end">
        {agencyLeft && <AgencyStampMark className="w-[34mm] h-[24mm] -mb-2" />}
        <p className="text-[9pt] font-bold tracking-wide text-slate-900 uppercase">AGENCIA</p>
      </div>
      <div className="flex flex-col items-center justify-end">
        <p className="text-[9pt] font-bold tracking-wide text-slate-900 uppercase">
          CONTRATANTE PRINCIPAL
        </p>
      </div>
    </div>
  );
}

export const ContractDocumentPreview: React.FC<ContractDocumentPreviewProps> = ({
  contract,
  agency,
}) => {
  const halfItinerary = Math.ceil(contract.itineraryDays.length / 2);
  const leftItinerary = contract.itineraryDays.slice(0, 1);
  const rightItinerary = contract.itineraryDays.slice(1);
  const useSplitItinerary = contract.itineraryDays.length >= 2;
  const displayLeftDays = useSplitItinerary ? leftItinerary : contract.itineraryDays.slice(0, halfItinerary);
  const displayRightDays = useSplitItinerary ? rightItinerary : contract.itineraryDays.slice(halfItinerary);

  const installmentsTotal = contract.installmentLines.reduce(
    (sum, item) => sum + (Number.isFinite(item.amount) ? item.amount : 0),
    0
  );

  return (
    <div className="print-only-container flex flex-col items-center gap-6 py-4">
      {/* ==================== PAGE 1 ==================== */}
      <article className="contract-a4-page shadow-md border border-slate-200">
        <DocumentWaveHeader agency={agency} />
        <div className="flex-1 px-[16mm] py-[3.5mm] text-[8.7pt] leading-[1.34] text-slate-900">
          <h1 className="text-center text-[14pt] font-bold tracking-wide text-black mb-2">
            CONTRATO DE VIAJE
          </h1>

          <div className="flex items-center justify-between text-[8.8pt] mb-3">
            <div>
              <span className="font-bold">Fecha contrato:</span> {contract.contractDateText}
            </div>
            <div>
              <span className="font-bold">Nº Contrato:</span>{' '}
              <span className="tabular-nums">{contract.contractNumber}</span>
            </div>
          </div>

          <div className="space-y-2 text-justify mb-2.5 text-[8.6pt]">
            <p className="indent-6">
              De una parte, en calidad de Organizador y de Minorista {agency.legalHolderName} (
              {agency.commercialName}), con {agency.licenseNote}, CIF {agency.cif} y domicilio en{' '}
              {agency.addressLine1}, {agency.addressLine2}, en adelante <span className="font-bold">AGENCIA</span>.
            </p>
            <p className="indent-6">
              Y, de otra parte, en calidad de CONTRATANTE PRINCIPAL,{' '}
              <span className="font-bold italic underline">{contract.clientFullName}</span> con DNI{' '}
              <span className="font-bold italic underline">{contract.clientDni}</span> domicilio en la
              localidad de <span className="font-bold italic underline">{contract.clientLocality}</span>, en
              adelante <span className="font-bold">CONTRATANTE PRINCIPAL</span> quien actúa en lo que
              respecta a este contrato en nombre propio.
            </p>
          </div>

          <div className="mb-3 text-[8.6pt]">
            <p className="font-bold mb-0.5">
              Lista de representados por el Contratante Principal en este contrato:
            </p>
            {contract.representedPeople.length === 0 ? (
              <p className="pl-2 text-slate-700">- .</p>
            ) : (
              <ul className="pl-2 space-y-0.5">
                {contract.representedPeople.map((person, idx) => (
                  <li key={`${person}-${idx}`}>- {person}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Two columns on Page 1 */}
          <div className="grid grid-cols-2 gap-6 text-[8.4pt] leading-[1.32]">
            {/* Left Column */}
            <div className="space-y-2.5">
              <section>
                <h2 className="text-[#26549c] text-[9.5pt] font-normal mb-0.5">
                  <span className="inline-block w-7">I.</span>Duración del viaje
                </h2>
                <p>
                  Fecha de inicio: {contract.startDateText} - Fecha de finalización: {contract.endDateText}.
                </p>
              </section>

              <section>
                <h2 className="text-[#26549c] text-[9.5pt] font-normal mb-0.5">
                  <span className="inline-block w-7">II.</span>Identificación del viaje
                </h2>
                <p className="text-justify">
                  Este contrato tiene por objeto el viaje combinado llamado “{contract.tripTitle}”, descrito en
                  adjunto y detallado, por lo que respecta a su contenido en la ficha técnica adjuntada como
                  anexo I.
                </p>
              </section>

              <section>
                <h2 className="text-[#26549c] text-[9.5pt] font-normal mb-0.5">
                  <span className="inline-block w-7">III.</span>Precio del viaje, y condiciones económicas
                </h2>
                <p className="font-bold text-[#c81e1e] mb-1.5">{contract.priceSummaryText}</p>
                <p className="text-justify mb-1.5">
                  Para la reserva de plaza habrá que hacer efectivo un depósito descrito en el Punto XIV del
                  presente contrato, en la cuenta bancaría de la AGENCIA con número:
                </p>
                <p className="mb-1.5">
                  IBAN: <span className="font-bold">{contract.bankIban}</span>, BENEFICIARIO:{' '}
                  <span className="font-bold">{contract.bankBeneficiary}</span>, CONCEPTO:{' '}
                  <span className="font-bold">{contract.bankConcept}</span>.{' '}
                  {contract.bankBic ? `BIC ${contract.bankBic}.` : ''}
                </p>
                <p className="text-justify">
                  Una vez comprobada la misma, se remitirá al CONTRATANTE PRINCIPAL la factura de anticipo
                  correspondiente por parte de la AGENCIA como resguardo del pago.
                </p>
              </section>

              <section>
                <h2 className="text-[#26549c] text-[9.5pt] font-normal mb-0.5">
                  <span className="inline-block w-7">IV.</span>Condiciones contractuales
                </h2>
                <p className="text-justify mb-1.5">
                  La realización del viaje contratado queda condicionada a la inscripción de{' '}
                  <span className="tabular-nums">{contract.minGroupSize}</span> personas. En el caso de que no
                  se consiga este grupo, la AGENCIA puede cancelar el viaje, sin derecho de indemnización para
                  el cliente, siempre que lo comunique en un plazo máximo de{' '}
                  <span className="tabular-nums">{contract.cancellationNoticeDays}</span> días naturales antes
                  de la fecha prevista para su inicio.
                </p>
                <p className="font-bold mb-1">Solicitud especial del cliente:</p>
                {contract.clientSpecialRequest.trim().length > 0 && (
                  <p className="italic text-slate-800 mb-1.5">{contract.clientSpecialRequest}</p>
                )}
                <div className="space-y-1.5">
                  {displayLeftDays.map((day, idx) => (
                    <div key={`${day.title}-${idx}`}>
                      <p className="italic text-slate-600">{day.title}</p>
                      <p className="text-justify">{day.description}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Right Column */}
            <div className="space-y-2.5">
              <div className="space-y-2">
                {displayRightDays.map((day, idx) => (
                  <div key={`${day.title}-${idx}`}>
                    <p className="italic text-slate-600">{day.title}</p>
                    <p className="text-justify">{day.description}</p>
                  </div>
                ))}
              </div>

              <section>
                <h2 className="text-[#26549c] text-[9.5pt] font-normal mb-0.5">
                  <span className="inline-block w-7">V.</span>Incumplimiento contractual in situ
                </h2>
                <p className="text-justify">
                  El CONTRATANTE PRINCIPAL queda obligado a comunicar a la AGENCIA, por escrito o por cualquier
                  otro medio que garantice la constancia, y lo antes posible, cualquier irregularidad o
                  incumplimiento en la ejecución del contrato que haya comprobado in situ.
                </p>
              </section>

              <section>
                <h2 className="text-[#26549c] text-[9.5pt] font-normal mb-0.5">
                  <span className="inline-block w-7">VI.</span>Pagos directos en destino
                </h2>
                <ul className="space-y-0.5">
                  {contract.destinationPayments.map((payment, idx) => (
                    <li key={`${payment}-${idx}`} className="flex gap-2">
                      <span>-</span>
                      <span>{payment}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h2 className="text-[#26549c] text-[9.5pt] font-normal mb-0.5">
                  <span className="inline-block w-7">VII.</span>Servicios Opcionales
                </h2>
                <ul className="space-y-1">
                  {contract.optionalServices.map((srv) => (
                    <li key={srv.id} className="flex items-start">
                      <CheckboxGlyph checked={srv.selected} />
                      <span>
                        {srv.label}{' '}
                        {srv.note && <span className="italic text-slate-700">{srv.note}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </div>
        <DocumentWaveFooter agency={agency} />
      </article>

      {/* ==================== PAGE 2 ==================== */}
      <article className="contract-a4-page shadow-md border border-slate-200">
        <DocumentWaveHeader agency={agency} />
        <div className="flex-1 px-[16mm] py-[4mm] text-[8.5pt] leading-[1.34] text-slate-900">
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column Page 2 */}
            <div className="space-y-3">
              <section>
                <h2 className="text-[#26549c] text-[9.5pt] font-normal mb-1">
                  <span className="inline-block w-8">VIII.</span>Transporte
                </h2>
                <p className="mb-1.5">{contract.transportSummary}</p>
                <p className="flex items-start">
                  <CheckboxGlyph checked={contract.transportChecked} />
                  <span>{contract.transportCheckboxLabel}</span>
                </p>
              </section>

              <section>
                <h2 className="text-[#26549c] text-[9.5pt] font-normal mb-1">
                  <span className="inline-block w-8">IX.</span>Seguros
                </h2>
                <p className="text-justify mb-2">
                  El CONTRANTE PRINCIPAL ha sido informado de acuerdo con la legislación vigente reguladora del
                  seguro privado, sobre la suscripción facultativa de un contrato de seguro que cubra los
                  gastos de cancelación por el consumidor y usuario, o de un contrato de asistencia que cubra
                  los gastos de repatriación o traslado al lugar de origen, en caso de accidente, enfermedad o
                  fallecimiento, habiendo libremente decidido la contratación de los siguientes seguros.
                </p>
                <div className="space-y-2">
                  <p className="flex items-start text-justify">
                    <CheckboxGlyph checked={contract.insuranceBasicSelected} />
                    <span>{contract.insuranceBasicLabel}</span>
                  </p>
                  <p className="flex items-start text-justify">
                    <CheckboxGlyph checked={contract.insuranceCancellationSelected} />
                    <span>{contract.insuranceCancellationLabel}</span>
                  </p>
                  <p className="flex items-start">
                    <CheckboxGlyph checked={contract.declineAssistanceInsurance} />
                    <span>El cliente no desea contratar el seguro de asistencia y repatriación.</span>
                  </p>
                  <p className="flex items-start">
                    <CheckboxGlyph checked={contract.declineCancellationInsurance} />
                    <span>El cliente no desea contratar el seguro de gastos de anulación.</span>
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-[#26549c] text-[9.5pt] font-normal mb-1">
                  <span className="inline-block w-8">X.</span>Información adicional
                </h2>
                <p className="text-justify mb-2">
                  El CONTRATANTE PRINCIPAL es informado en este acto de la situación social o política
                  conflictiva que existe en el país de destino y de la dirección electrónica{' '}
                  <span className="underline">http://www.mae.es</span> donde se pueden encontrar las
                  recomendaciones oficiales del Ministerio de Asuntos Exteriores del Gobierno Español, acepta
                  el riesgo que esto comporta y exime a la AGENCIA de la responsabilidad por las consecuencias
                  negativas que pueden derivarse de esta circunstancia.
                </p>
                <p className="text-justify">
                  Respecto de los visados y documentación exigida, se informa al CONTRATANTE PRINCIPAL que en
                  el teléfono 902.11.38.29 y en la dirección electrónica{' '}
                  <span className="underline">http://www.visados.org</span> ó{' '}
                  <span className="underline break-all">{contract.maeDestinationUrl}</span> puede encontrar
                  toda la información complementaria a la expresada a la ficha técnica del viaje.
                </p>
              </section>
            </div>

            {/* Right Column Page 2 */}
            <div className="space-y-3">
              <p className="text-justify">
                Y con relación a las exigencias en materia sanitaria (certificaciones y vacunas contra
                enfermedades) para la entrada legal en el país, se informa al CONTRATANTE PRINCIPAL, igualmente
                como complemento del contenido de la ficha técnica, de la existencia del centro provincial de
                vacunación internacional en Catalunya (Teléfonos: Barcelona, 93.443.05.07; Girona,
                972.18.26.00; Tarragona, 977.24.01.99; Lleida, 973.70.16.00). En Murcia (Teléfono: Murcia
                968989421 y 968989422, Cartagena 968 98 10 00 / 02). En Madrid 91 272 94 41 / 42 / 43. En el
                resto de comunidades se puede consultar en la siguiente web{' '}
                <span className="underline break-all">
                  https://www.sanidad.gob.es/areas/sanidadExterior/laSaludTambienViaja/centrosVacunacionInternacional/centrosvacu.htm
                </span>
              </p>

              <section>
                <h2 className="text-[#26549c] text-[9.5pt] font-normal mb-1">
                  <span className="inline-block w-8">XI.</span>Especialidad del viaje alternativo.
                </h2>
                <p className="text-justify mb-2">
                  El CONTRATANTE PRINCIPAL es informado en este acto de las peculiares características del
                  viaje alternativo que adquiere, especialmente de las circunstancias climatológicas de la zona
                  de destino, de las limitaciones de los profesionales locales y de la falta de equiparación de
                  la infraestructura viaria, aérea y hotelera de lugar con el estándar convencional de los
                  países occidentales.
                </p>
                <p className="text-justify">
                  El itinerario definitivo detallado en la ficha técnica tiene carácter orientativo y el
                  cliente acepta expresamente las modificaciones que se puedan producir in situ por
                  circunstancias climatológicas, por imposiciones imprevistas de los proveedores de la zona o
                  por razones de la limitada infraestructura local. Cualquier otra alteración de la ruta habrá
                  de ser aprobada por la AGENCIA.
                </p>
              </section>

              <section>
                <h2 className="text-[#26549c] text-[9.5pt] font-normal mb-1">
                  <span className="inline-block w-8">XII.</span>Declaración personal.
                </h2>
                <p className="text-justify">
                  El CONTRATANTE PRINCIPAL manifiesta que no padece ninguna enfermedad crónica ni minusvalía
                  psíquica o física que impida el seguimiento normal del desarrollo del viaje.
                </p>
              </section>

              <section>
                <h2 className="text-[#26549c] text-[9.5pt] font-normal mb-1">
                  <span className="inline-block w-8">XIII.</span>Regulación de la relación contractual
                </h2>
                <p className="text-justify">
                  El presente contrato se rige por las cláusulas incluidas en este documento, por la ficha
                  técnica del viaje que detalla su contenido definitivo (anexo I).
                </p>
              </section>
            </div>
          </div>
        </div>
        <DocumentWaveFooter agency={agency} />
      </article>

      {/* ==================== PAGE 3 ==================== */}
      <article className="contract-a4-page shadow-md border border-slate-200">
        <DocumentWaveHeader agency={agency} />
        <div className="flex-1 px-[16mm] py-[5mm] text-[8.8pt] leading-[1.35] text-slate-900">
          <h2 className="text-[#26549c] text-[10pt] font-normal mb-3">
            <span className="inline-block w-8">XIV.</span>Resumen de Conceptos y pagos
          </h2>

          <div className="grid grid-cols-2 gap-8 items-start">
            {/* Left financial summary table */}
            <div>
              <table className="w-full border-collapse text-[8.6pt]">
                <tbody>
                  {contract.conceptLines.map((line) => (
                    <tr key={line.id} className="border-t border-black">
                      <td className="py-1 pr-2 align-top">{line.label}</td>
                      <td className="py-1 text-right align-top whitespace-nowrap tabular-nums">
                        {formatEuroCompact(line.amount)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-black">
                    <td className="pt-2 text-right font-bold pr-4">TOTAL</td>
                    <td className="pt-2 text-right font-bold whitespace-nowrap tabular-nums">
                      {formatEuro(contract.totalAmount)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <p className="italic mt-5 text-[8.7pt]">Qué serán abonado en los siguientes plazos:</p>
            </div>

            {/* Right installment schedule & acceptance */}
            <div className="space-y-4">
              <div className="flex gap-2 items-start text-[8.6pt]">
                <span>-</span>
                <p className="italic font-semibold text-justify">{contract.installmentIntro}</p>
              </div>

              <table className="w-full border-collapse text-[8.6pt]">
                <tbody>
                  {contract.installmentLines.map((inst) => (
                    <tr key={inst.id} className="border-t border-black">
                      <td className="py-1 pr-2 italic">{inst.label}</td>
                      <td className="py-1 text-right italic whitespace-nowrap tabular-nums">
                        {formatEuroCompact(inst.amount)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-black">
                    <td />
                    <td className="pt-1.5 text-right font-bold tabular-nums">
                      {formatEuro(installmentsTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="pt-6 text-[8.8pt] space-y-0.5">
                <p>El CONTRATANTE PRINCIPAL acepta y firma el documento.</p>
                <p>En prueba de conformidad, firma el presente contrato.</p>
              </div>
            </div>
          </div>

          <div className="mt-10">
            <SignatureRow agencyLeft />
          </div>
        </div>
        <DocumentWaveFooter agency={agency} />
      </article>

      {/* ==================== PAGE 4 (ANEXO I) ==================== */}
      <article className="contract-a4-page shadow-md border border-slate-200">
        <DocumentWaveHeader agency={agency} />
        <div className="flex-1 px-[16mm] py-[5mm] text-[9pt] leading-[1.4] text-slate-900">
          <h2 className="text-[15pt] font-bold text-black mb-4 tracking-tight">
            ANEXO I. FICHA TÉCNICA
          </h2>

          <div className="space-y-4">
            <section>
              <h3 className="text-[#26549c] text-[9.8pt] font-normal mb-2">
                <span className="inline-block w-8">I.</span>CONTENIDO DEFINITIVO DEL VIAJE COMBINADO
              </h3>
              <div className="pl-8 space-y-1.5 text-[8.9pt]">
                <div>
                  <p>
                    <span className="inline-block w-8">A.</span>
                    {contract.transportIncluded ? 'Transporte (INCLUIDO):' : 'Transporte (NO INCLUIDO):'}
                  </p>
                  <p className="pl-8">
                    <span className="inline-block w-7">1.</span>
                    {contract.anexoTransportDetail}
                  </p>
                </div>
                <p>
                  <span className="inline-block w-8">B.</span>Gestiones: {contract.anexoManagementDetail}
                </p>
                <p>
                  <span className="inline-block w-8">C.</span>Alojamiento: {contract.anexoAccommodationDetail}
                </p>
                <div>
                  <p>
                    <span className="inline-block w-8">D.</span>Otros servicios incluidos:
                  </p>
                  {contract.anexoIncludedServices.map((srv, idx) => (
                    <p key={`${srv}-${idx}`} className="pl-8">
                      <span className="inline-block w-7">{idx + 1}.</span>
                      {srv}
                    </p>
                  ))}
                </div>
                <p>
                  <span className="inline-block w-8">E.</span>Itinerario: “{contract.tripTitle}”
                </p>
                <p>
                  <span className="inline-block w-8">F.</span>Seguro:{' '}
                  <span className="font-bold">Opcional.</span> Se recuerda que todos nuestros seguros se
                  pueden contratar en cualquier momento antes del viaje y tienen una cadencia de 72h.
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-[#26549c] text-[9.8pt] font-normal mb-1">
                <span className="inline-block w-8">II.</span>INFORMACIÓN SOBRE EL PAÍS DE DESTINO
              </h3>
              <p className="text-[8.8pt]">
                (Condiciones climatológicas, nivel de infraestructuras, características de los profesionales
                locales, situación política y social, exigencias sanitarias y documentales de entrada,
                consejos y recomendaciones, etc.).
              </p>
            </section>

            <section>
              <h3 className="text-[#26549c] text-[9.8pt] font-normal mb-1.5">
                <span className="inline-block w-8">III.</span>3. Consultar información para viajeros del
                Ministerio de Asuntos Exteriores
              </h3>
              <ul className="space-y-0.5 text-[8.8pt] italic">
                {contract.anexoHealthContacts.map((contact, idx) => (
                  <li key={`${contact}-${idx}`}>- {contact}</li>
                ))}
              </ul>
            </section>
          </div>

          <div className="mt-10">
            <SignatureRow agencyLeft />
          </div>
        </div>
        <DocumentWaveFooter agency={agency} />
      </article>

      {/* ==================== PAGE 5 (ANEXO II - Part 1) ==================== */}
      <article className="contract-a4-page shadow-md border border-slate-200">
        <DocumentWaveHeader agency={agency} />
        <div className="flex-1 px-[16mm] py-[4mm] text-[8.4pt] leading-[1.33] text-slate-900">
          <h2 className="text-center text-[14pt] font-bold text-black mb-3 leading-tight">
            ANEXO II.-CONDICIONES GENERALES DE LA CONTRATACIÓN
          </h2>

          <div className="grid grid-cols-2 gap-6 text-justify">
            <div className="space-y-2.5">
              <section>
                <h3 className="text-[#26549c] text-[9.5pt] font-normal mb-0.5 text-left">
                  <span className="inline-block w-7">I.</span>Regulación jurídica aplicable
                </h3>
                <p className="mb-1.5">
                  La relación contractual entre la agencia organizadora y el cliente se rige por las cláusulas
                  del contrato de viaje combinado, por la ficha técnica del viaje que detalla su contenido
                  definitivo y por las presentes condiciones generales, todas redactadas de conformidad con lo
                  que dispone la Reglamentación catalana de las agencias de viajes (Decreto 168/1994, de 30 de
                  mayo) y por la Ley estatal de condiciones generales de contratación (Ley 7/1998, de 13 de
                  abril).
                </p>
                <p>
                  Las partes contratantes se someten expresamente a la jurisdicción de los Tribunales de{' '}
                  {agency.jurisdictionCity} para resolver las discrepancias o reclamaciones que susciten la
                  interpretación o la ejecución del contrato de viaje combinado y de estas condiciones
                  generales, y renuncian al foro propio en caso que sea diferente.
                </p>
              </section>

              <section>
                <h3 className="text-[#26549c] text-[9.5pt] font-normal mb-0.5 text-left">
                  <span className="inline-block w-7">II.</span>Inscripción al viaje.
                </h3>
                <p className="mb-1.5">
                  El acto de inscripción al viaje y la consideración de reserva exige que el cliente haya
                  satisfecho la cuantía correspondiente al Pago reflejado en el punto número XIV del presente
                  contrato, excepto que las condiciones económicas de los proveedores impongan el pago avanzado
                  de otro importe. Igualmente, en el punto número XIV quedarán reflejadas las fechas de los
                  sucesivos plazos de pagos, con sus cuantías correspondiente.
                </p>
                <p>
                  Igualmente, si contrata con la AGENCIA algún tipo de seguro se abonarán dicha cuantía en el
                  momento de la firma del presente junto con el primer pago.
                </p>
              </section>

              <section>
                <h3 className="text-[#26549c] text-[9.5pt] font-normal mb-0.5 text-left">
                  <span className="inline-block w-7">III.</span>Modificación del viaje por parte del organizador
                </h3>
                <p className="mb-1.5">
                  Cuando el organizador se vea obligado a modificar de manera significativa los elementos
                  esenciales del viaje, lo habrá de notificar por escrito al cliente lo antes posible para que
                  este pueda optar entre rescindir la reserva o el contrato, con derecho al reembolso íntegro
                  de las cantidades pagadas, o bien aceptar las consecuencias de la modificación del viaje
                  inicial.
                </p>
                <p className="mb-1.5">
                  En el caso de que el cliente no comunique por escrito su decisión en los tres días hábiles
                  siguientes a la notificación, se entenderá que acepta las nuevas condiciones del viaje.
                </p>
                <p>
                  Se consideran causas suficientes para la modificación del viaje los casos de fuerza mayor
                  (circunstancia ajena, anormal e imprevisible) y cuando no concurra el número de personas
                  exigidas para la realización del viaje.
                </p>
              </section>
            </div>

            <div className="space-y-2.5">
              <section>
                <h3 className="text-[#26549c] text-[9.5pt] font-normal mb-0.5 text-left">
                  <span className="inline-block w-7">IV.</span>Condición contractual
                </h3>
                <p>
                  La realización del viaje queda condicionada a la inscripción de{' '}
                  <span className="tabular-nums">{contract.minGroupSize}</span> personas. En el caso de que no
                  se forme este grupo, la AGENCIA puede cancelar el viaje sin derecho de indemnización para el
                  cliente siempre que lo comunique en un término máximo de{' '}
                  <span className="tabular-nums">{contract.cancellationNoticeDays}</span> días naturales antes
                  de la fecha prevista para su inicio.
                </p>
              </section>

              <section>
                <h3 className="text-[#26549c] text-[9.5pt] font-normal mb-0.5 text-left">
                  <span className="inline-block w-7">V.</span>Desistimiento por parte del cliente
                </h3>
                <p className="mb-1.5">
                  Si el cliente desiste del viaje, después de la formalización las condiciones de cancelación
                  se aplicarán en función de la fecha en la que se realiza la anulación con respecto a la fecha
                  de salida.
                </p>
                <ul className="space-y-1 mb-1.5">
                  <li>
                    - 12 meses antes de la salida. Gastos del 10% del precio total del viaje + importe de
                    penalización establecido por la compañía aérea del billete de avión si se hubiera emitido.
                  </li>
                  <li>
                    - De 12 a 6 meses antes de la salida. 50% del precio total del viaje + importe de
                    penalización establecido por la compañía aérea del billete de avión si se hubiera emitido.
                  </li>
                  <li>
                    - De 6 a 2 meses antes de la salida. 75% del precio total del viaje + importe de
                    penalización establecido por la compañía aérea del billete de avión si se hubiera emitido.
                  </li>
                  <li>- Menos de 60 días antes de la salida. 100% del precio total del viaje.</li>
                </ul>
                <p>
                  En cualquier caso, las consecuencias económicas de la anulación en caso de condiciones
                  especiales de contratación (como tarifas de transporte de precio reducido o exigencias
                  económicas en determinados proveedores) se repercutirán sobre el cliente siempre que el
                  contrato haya dejado constancia.
                </p>
              </section>

              <section>
                <h3 className="text-[#26549c] text-[9.5pt] font-normal mb-0.5 text-left">
                  <span className="inline-block w-7">VI.</span>Precio del viaje
                </h3>
                <p className="mb-1.5">
                  El precio del viaje incluye el impuesto sobre el valor añadido cuando es aplicable y se
                  entiende vigente durante la temporada que se indique.
                </p>
                <p>
                  El precio puede ser revisado hasta 20 días naturales antes de la fecha de la salida en el
                  caso que haya variaciones en el coste de los transportes (incluido el precio del
                  carburante), en las tasas o impuestos referentes a determinados servicios (como los de
                  aterrizaje, embarque o desembarque en puertos y aeropuertos) y en los tipos de cambio
                  aplicados al viaje. Ante la variación del precio, el cliente puede aceptar el suplemento o
                  bien desistir de la reserva o del contrato (si éste se ha formalizado).
                </p>
              </section>
            </div>
          </div>
        </div>
        <DocumentWaveFooter agency={agency} />
      </article>

      {/* ==================== PAGE 6 (ANEXO II - Part 2) ==================== */}
      <article className="contract-a4-page shadow-md border border-slate-200">
        <DocumentWaveHeader agency={agency} />
        <div className="flex-1 px-[16mm] py-[4mm] text-[8.4pt] leading-[1.33] text-slate-900">
          <div className="grid grid-cols-2 gap-6 text-justify">
            <div className="space-y-2.5">
              <section>
                <h3 className="text-[#26549c] text-[9.5pt] font-normal mb-0.5 text-left">
                  <span className="inline-block w-7">VII.</span>Establecimientos de alojamiento
                </h3>
                <p>
                  El contenido y la calidad de los servicios prestados por establecimientos de alojamiento
                  turístico están determinados por la categoría turística local especificada en el contrato o
                  en la ficha técnica. En el supuesto de que esta clasificación no exista, la descripción y las
                  características propias del establecimiento quedarán expresadas en el contrato, podrá ser
                  modificado siempre manteniendo la categoría turística del hotel/embarcación, o en su defecto
                  aumentando la misma.
                </p>
              </section>

              <section>
                <h3 className="text-[#26549c] text-[9.5pt] font-normal mb-0.5 text-left">
                  <span className="inline-block w-7">VIII.</span>Documentación
                </h3>
                <p className="mb-1.5">
                  El cliente tiene la obligación de llevar consigo siempre el documento nacional de identidad o
                  pasaporte original y vigente con más de seis meses de caducidad al día de la fecha del vuelo
                  de regreso.
                </p>
                <p className="mb-1.5">
                  La agencia tiene el deber de informar sobre los documentos especiales (como visados,
                  certificaciones médicas de vacunación o sanidad, etc.) que exige el lugar de destino del
                  viaje para la entrada en el país, y el cliente asume expresamente tanto su tramitación
                  (excepto en caso de otro acuerdo con la agencia) como las consecuencias derivadas de no
                  llevarlos o del hecho de que no sean válidos o vigentes.
                </p>
                <p className="mb-1.5">
                  Los clientes extranjeros se han de asegurar que cumplen las exigencias en materia de visados
                  a fin de entrar, salir y circular sin problemas por el país de destino, y asumen las
                  consecuencias de su incumplimiento.
                </p>
                <p>
                  Los menores de 18 años han de llevar un documento que les autorice a hacer el viaje, firmado
                  por los dos padres, por el padre que tenga la guarda y custodia (en casos de matrimonios
                  separados o divorciados) o por el tutor.
                </p>
              </section>

              <section>
                <h3 className="text-[#26549c] text-[9.5pt] font-normal mb-0.5 text-left">
                  <span className="inline-block w-7">IX.</span>Cesión de la reserva
                </h3>
                <p>
                  El cliente puede ceder su reserva a una tercera persona siempre que lo comunique a la agencia
                  con 45 días de antelación a la fecha de inicio del viaje. El nuevo cliente deberá correr con
                  los gastos que genere el cambio de reserva, así como el cambio de nombre de los billetes y
                  embarques si lo permiten las compañías contratadas, así como si no se pudiere, el nuevo
                  billete aéreo con las tasas en la fecha de emisión del nuevo billete.
                </p>
              </section>
            </div>

            <div className="space-y-2.5">
              <section>
                <h3 className="text-[#26549c] text-[9.5pt] font-normal mb-0.5 text-left">
                  <span className="inline-block w-7">X.</span>Responsabilidad
                </h3>
                <p>
                  La agencia organizadora ha de responder de las consecuencias que se deriven de la
                  inejecución o de la ejecución deficiente del contrato en proporción a su intervención en la
                  gestión del viaje combinado. No obstante ello, quedará eximida de esta responsabilidad cuando
                  haya sido por una causa de fuerza mayor (circunstancia ajena, anormal e imprevisible), por
                  un hecho que ni la agencia organizadora ni los proveedores hayan podido evitar o cuando la
                  causa sea imputable al cliente o a un tercero. El cliente queda obligado a comunicar a la
                  agencia organizadora, tan pronto como sea posible y por escrito, cualquier incumplimiento en
                  la ejecución del contrato que haya comprobado in situ. Se podrá admitir la modificación del
                  contrato inicial siempre que la alteración del itinerario o la substitución de servicios estén
                  justificados por circunstancias climatológicas, por imposiciones imprevistas de los
                  proveedores en la zona o por razones de la limitada infraestructura local. Cualquier otra
                  alteración de la ruta ha de ser consentida expresamente por la agencia.
                </p>
              </section>

              <section>
                <h3 className="text-[#26549c] text-[9.5pt] font-normal mb-0.5 text-left">
                  <span className="inline-block w-7">XI.</span>Tratamiento de datos de carácter personal
                </h3>
                <p className="mb-1.5">
                  Los datos personales de las personas físicas que, en nombre propio o en representación de
                  entidades jurídicas, contraten con esta agencia se incorporarán y tratarán en un fichero
                  automatizado propiedad de {agency.bankBeneficiary}, notificado a la Agencia Española de
                  Protección de Datos y que cumple las medidas de seguridad necesarias para garantizar la
                  total seguridad de los datos. En cumplimiento de la normativa, el titular de los datos puede
                  ejercitar los derechos de acceso, cancelación, rectificación y oposición poniéndose en
                  contacto con:
                </p>
                <p>
                  {agency.bankBeneficiary}, {agency.addressLine1}. La agencia queda facultada para utilizar los
                  datos durante la vigencia del contrato y para la información de sus servicios.
                </p>
              </section>

              <section>
                <h3 className="text-[#26549c] text-[9.5pt] font-normal mb-0.5 text-left">
                  <span className="inline-block w-7">XII.</span>Vigencia
                </h3>
                <p>
                  Estas cláusulas de condiciones generales han sido redactadas con fecha{' '}
                  {contract.generalConditionsDate} y tienen una vigencia indefinida. En prueba de conformidad
                  firman el Anexo I y este conjunto de cláusulas de condiciones generales.
                </p>
              </section>
            </div>
          </div>

          <div className="mt-4">
            <SignatureRow agencyLeft />
          </div>
        </div>
        <DocumentWaveFooter agency={agency} />
      </article>

      {/* ==================== PAGE 7 (AUTORIZACIÓN IMÁGENES) ==================== */}
      <article className="contract-a4-page shadow-md border border-slate-200">
        <DocumentWaveHeader agency={agency} />
        <div className="flex-1 px-[20mm] py-[8mm] text-[9.8pt] leading-[1.48] text-slate-900">
          <h2 className="text-center text-[15pt] font-bold text-black mb-7 leading-snug">
            AUTORIZACIÓN PARA LA PUBLICACIÓN DE IMÁGENES DE CLIENTES POR MAR DE HIELO
          </h2>

          <div className="space-y-4 text-justify">
            <p className="indent-8">
              Con la inclusión de las nuevas tecnologías dentro de las comunicaciones, publicaciones y
              acciones comerciales que puede realizar el Grupo Mar de Hielo ({agency.bankBeneficiary}), en
              adelante MAR DE HIELO y la posibilidad de que en estas puedan aparecer los datos personales y/o
              imágenes que ha proporcionado a nuestra empresa dentro del vínculo comercial existente.
            </p>
            <p className="indent-8">
              Y dado que el derecho a la propia imagen está reconocido al artículo 18 de la Constitución y
              regulado por la Ley 1/1982, de 5 de mayo, sobre el derecho al honor, a la intimidad personal y
              familiar y a la propia imagen y el Reglamento (UE) 2016/679 del Parlamento Europeo y del
              Consejo, de 27 de abril de 2016, relativo a la protección de las personas físicas en lo que
              respecta al tratamiento de datos personales y a la libre circulación de estos datos, MAR DE HIELO
              pide su consentimiento para poder publicar los datos personales que nos ha facilitado o imágenes
              en las cuales aparezcan individualmente o en grupo que con carácter comercial se puedan realizar
              con nuestra empresa, en todo caso sin ningún tipo de derecho a pago por derechos de imagen, ni
              publicitarios.
            </p>
            <p>
              El CONTRATANTE PRINCIPAL autoriza a MAR DE HIELO a un uso comercial de mis datos personales
              facilitados dentro de la relación comercial con nuestra empresa y para poder ser publicados en:
            </p>
            <ul className="space-y-1 pl-1">
              <li>- La página web y perfiles en redes sociales de la empresa.</li>
              <li>- Filmaciones destinadas a difusión comercial.</li>
              <li>- Fotografías para revistas o publicaciones de ámbito relacionado con nuestro sector.</li>
            </ul>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-8 text-[10pt]">
            <p className="flex items-center">
              <CheckboxGlyph checked={contract.imageAuthorization === 'authorized'} />
              <span>Autorizo a Mar de Hielo.</span>
            </p>
            <p className="flex items-center">
              <CheckboxGlyph checked={contract.imageAuthorization === 'declined'} />
              <span>Desestimo la Autorización.</span>
            </p>
          </div>

          <div className="mt-12">
            <SignatureRow agencyLeft />
          </div>
        </div>
        <DocumentWaveFooter agency={agency} />
      </article>
    </div>
  );
};
