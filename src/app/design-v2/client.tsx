"use client";

import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import SAMPLE_REPORTS_JSON from "./sample-reports.json";
import { Styles } from "./_shared/styles";
import { Mark } from "./_shared/mark";
import { Nav } from "./_shared/nav";
import { Footer } from "./_shared/footer";
import { AiqIcon, type IconName } from "./_shared/icons";

/* ═══════════════════════════════════════════════════════════════
   OneGoodArea · Design V2
   Forest green + signal chartreuse + white
   Fraunces (display) · Inter (body) · Geist Mono (labels)
   ═══════════════════════════════════════════════════════════════ */

/* ─────── Domain data ─────── */

/* Real UK + Ireland outlines extracted from Natural Earth 50m world-atlas.
   See scripts/extract-uk.js. Coordinates are already projected into a
   320×360 SVG viewBox using the bounds below · do not change one without
   re-running the extract script. */
const MAP_VB = { w: 320, h: 360 };
const UK_BOUNDS = { minLat: 49.7, maxLat: 60.9, minLng: -10.9, maxLng: 2.2 };
const UK_PATH = "M201.1,298.2L199.3,299.5L193.5,300.9L191.0,302.3L186.6,305.4L185.8,305.7L179.2,304.9L174.3,300.9L171.2,299.2L169.9,299.0L168.6,299.5L165.7,300.0L162.8,299.9L164.3,298.0L166.3,297.0L161.8,296.3L160.5,295.7L159.1,294.4L155.6,294.2L153.9,294.5L151.0,296.3L146.5,298.1L141.1,295.5L140.0,294.4L140.0,292.2L139.2,290.5L137.7,289.9L139.7,287.7L142.0,286.2L147.1,284.7L154.9,281.2L159.2,279.7L163.2,277.2L164.9,275.6L166.1,273.4L167.3,270.8L169.0,268.6L167.4,268.1L166.6,266.5L166.8,264.9L167.5,263.4L166.9,261.6L165.7,259.7L165.8,258.3L166.1,256.6L163.0,256.7L159.8,257.3L157.0,258.4L154.3,259.9L151.9,260.2L151.9,258.9L152.9,257.4L155.7,255.3L158.7,253.5L159.7,252.1L160.5,250.6L162.0,249.3L165.9,246.9L173.2,244.2L174.3,244.0L177.2,244.4L180.0,244.0L182.5,243.0L185.0,242.7L190.6,245.6L188.9,241.2L191.4,240.2L195.0,244.1L196.3,244.5L199.1,244.0L198.0,243.3L196.7,243.2L195.1,242.7L193.8,241.4L191.4,237.4L191.6,235.1L193.0,232.6L194.8,230.4L193.4,229.9L192.2,229.1L191.9,226.8L192.3,224.8L195.4,223.0L196.3,220.4L196.7,217.4L196.2,216.1L193.1,216.3L191.6,216.9L190.3,217.7L188.9,217.7L185.1,214.4L182.9,211.9L179.1,206.8L178.5,203.6L181.6,196.9L186.5,192.6L192.1,191.1L191.0,190.8L182.4,190.8L179.5,191.4L176.9,193.1L175.4,193.6L173.9,193.8L172.4,194.7L171.1,195.9L169.6,196.7L166.7,196.5L165.3,196.8L164.3,196.0L163.5,194.9L162.4,194.6L161.1,194.9L158.6,196.5L155.9,197.4L152.8,196.4L148.6,194.6L147.8,195.3L146.8,197.0L146.3,199.6L143.4,197.3L140.8,194.2L139.9,192.3L139.9,190.1L141.3,189.2L142.7,190.0L144.9,184.8L149.3,178.1L150.9,176.1L152.0,173.6L151.8,171.8L150.8,170.4L146.8,167.2L146.8,164.5L147.2,161.6L148.4,159.8L148.8,159.4L154.3,159.5L152.2,158.5L147.9,155.9L148.0,154.9L149.0,152.4L148.6,152.7L147.7,153.8L145.9,156.6L144.9,157.3L141.9,157.9L141.3,159.3L140.8,159.7L139.3,159.8L138.9,161.1L138.5,161.2L138.1,159.8L138.1,157.5L138.7,155.4L139.8,153.7L144.2,150.0L142.0,151.2L137.2,154.6L134.7,156.9L134.1,157.6L133.9,158.3L133.9,159.0L135.0,163.1L134.7,164.9L130.5,177.1L129.7,178.3L129.0,179.0L128.3,179.1L126.3,178.9L125.3,178.0L125.3,177.0L125.8,175.4L127.4,169.6L128.2,168.0L129.4,166.5L131.8,163.8L131.8,163.7L130.1,164.2L129.4,164.0L128.9,163.5L129.2,155.8L130.5,153.2L131.1,149.4L132.2,146.3L133.5,143.9L134.6,141.0L136.1,139.6L136.5,137.6L138.2,135.4L139.5,133.2L138.8,133.4L130.3,139.3L128.2,140.4L125.2,140.1L123.0,139.5L121.2,138.0L120.4,135.3L118.3,135.3L116.5,134.8L116.5,134.4L118.8,132.9L122.7,132.4L126.3,130.1L123.0,128.5L123.3,128.0L126.1,126.6L129.6,122.0L130.4,117.9L128.7,115.9L128.1,114.6L124.7,113.2L124.1,111.3L124.5,110.3L125.6,109.3L127.3,108.5L129.9,107.8L127.5,107.0L126.7,106.0L126.0,104.7L126.0,103.9L127.2,100.3L127.9,98.9L129.3,97.0L135.6,97.2L136.3,96.3L137.0,96.3L140.3,97.0L139.8,96.2L134.5,91.8L134.0,91.0L135.5,88.6L135.6,87.6L135.4,86.4L135.9,85.6L137.6,85.1L142.7,85.2L143.9,84.8L143.4,83.6L142.1,82.1L142.0,80.9L142.2,79.8L142.3,77.5L142.5,76.5L143.7,75.0L144.7,74.6L146.0,74.3L148.8,74.8L149.9,75.4L151.1,76.8L152.0,76.7L155.5,75.2L156.6,75.0L158.0,76.7L163.9,75.3L171.9,74.7L176.8,73.7L181.9,73.4L186.6,72.3L191.6,72.8L191.8,73.4L191.6,74.3L190.3,76.6L190.5,79.2L190.2,80.1L189.6,81.0L187.8,82.9L182.9,85.5L174.1,91.5L168.8,94.5L168.1,96.0L167.7,98.0L170.8,98.4L172.0,99.1L171.3,100.1L166.7,103.6L165.3,106.8L168.9,106.7L171.8,106.1L177.7,104.1L183.1,102.6L185.8,102.5L190.9,103.7L192.1,103.7L194.3,103.2L196.5,103.1L211.4,103.5L215.6,102.8L218.4,103.6L220.7,105.7L222.9,109.5L222.8,110.1L221.5,111.8L219.0,114.0L216.9,117.0L216.3,118.6L215.9,120.4L215.2,122.0L211.1,129.7L206.9,134.0L205.2,137.1L202.9,139.5L200.8,141.0L198.5,142.0L191.8,143.1L190.0,143.8L187.8,145.1L185.4,145.8L188.1,145.7L190.9,145.0L195.8,144.7L201.5,147.3L201.0,149.3L198.7,151.0L193.5,151.3L188.7,154.9L186.5,156.0L184.2,156.6L181.3,156.4L176.0,155.5L173.7,154.5L175.8,156.1L178.1,157.0L191.8,159.0L192.6,158.8L196.9,156.6L202.7,156.6L213.8,160.6L217.0,163.7L221.5,168.0L224.0,169.8L225.9,171.3L226.9,173.6L229.1,181.3L231.5,188.8L234.7,196.9L236.1,199.2L238.1,200.7L247.7,204.4L249.9,205.6L253.6,209.1L257.2,212.8L260.6,215.7L264.2,218.0L262.4,219.2L261.2,221.1L262.2,223.7L263.6,226.1L266.5,230.1L269.1,234.4L268.2,233.7L267.2,233.4L265.8,233.4L264.5,233.3L262.0,231.9L259.6,230.2L255.0,230.9L252.4,230.6L250.1,230.6L254.4,231.6L259.1,231.7L269.4,238.9L272.9,243.1L274.9,248.8L273.5,251.3L271.3,253.0L269.3,254.9L267.4,257.0L273.1,260.1L274.3,260.0L275.6,259.5L276.8,258.5L278.9,255.9L279.9,255.0L283.5,254.7L286.4,254.9L289.4,255.4L292.1,255.2L297.3,256.4L300.0,257.4L306.8,261.8L308.2,264.3L308.9,267.5L309.0,271.0L307.8,274.2L306.5,277.1L305.7,280.9L305.2,282.2L304.4,283.3L300.8,286.3L298.4,287.4L297.4,286.9L296.4,287.0L296.3,287.7L297.3,289.2L297.4,291.1L295.3,292.4L293.1,293.0L289.6,292.2L284.6,294.7L288.2,296.0L288.9,297.4L288.0,299.8L285.8,300.9L283.3,301.4L280.7,301.5L278.6,302.1L276.6,303.2L279.1,302.6L280.9,303.2L282.0,305.2L283.0,305.8L288.0,306.6L291.0,306.6L297.0,306.1L299.8,306.2L300.9,306.5L300.9,308.2L300.4,312.4L299.6,313.2L291.8,316.7L290.1,319.1L289.7,320.6L285.1,320.4L283.0,321.9L279.2,322.9L276.4,324.0L273.6,325.4L271.2,325.8L261.3,324.2L255.2,324.3L247.0,325.8L244.9,325.5L241.9,324.2L238.6,323.2L234.9,322.8L231.7,321.5L233.7,324.0L229.2,326.3L227.2,326.8L225.1,326.7L220.7,327.4L216.6,327.1L217.2,328.7L218.3,330.2L217.5,330.8L216.5,331.0L208.9,329.8L207.7,330.1L206.9,331.1L204.0,330.6L201.3,328.8L198.4,327.7L195.4,327.1L193.0,327.3L183.1,330.0L181.1,332.7L180.1,336.6L178.7,340.0L176.3,342.6L173.6,343.0L171.0,341.2L166.1,339.2L164.3,337.8L163.8,337.7L163.2,338.2L161.3,338.8L159.3,338.8L156.2,339.4L150.8,341.0L148.6,342.1L143.9,345.2L142.9,346.0L141.3,349.1L138.6,349.7L136.2,347.7L133.5,347.0L130.7,347.7L128.9,348.7L128.2,347.9L128.1,346.1L130.2,344.0L135.8,342.5L140.6,338.3L143.1,335.8L144.0,334.4L145.2,333.5L146.7,333.2L147.5,331.6L154.3,325.4L154.9,324.0L155.2,321.4L155.8,319.0L161.3,317.3L163.9,312.2L164.6,311.8L172.4,310.8L178.1,310.9L183.8,311.9L186.7,312.0L189.6,311.6L191.9,310.2L195.9,305.2L198.1,303.0L200.6,300.9L203.0,298.7L206.9,294.4L204.2,295.9L201.1,298.2ZM163.8,243.6L164.7,244.2L167.4,244.1L166.5,245.4L163.7,246.9L161.7,248.4L159.5,249.6L158.3,248.2L157.0,248.3L155.1,245.5L154.7,241.5L157.3,240.5L160.9,240.5L163.8,243.6ZM204.0,53.6L201.2,53.7L202.6,51.8L204.3,51.3L207.5,51.5L206.9,52.4L204.0,53.6ZM240.8,12.4L240.2,12.8L237.8,9.5L239.6,5.8L241.7,5.9L242.0,6.9L241.9,7.8L240.7,7.9L240.6,8.2L241.0,9.9L241.0,11.9L240.8,12.4ZM234.3,11.7L234.8,13.9L236.1,13.3L238.0,15.5L239.0,15.5L240.5,14.6L240.2,16.6L238.6,22.3L238.1,23.2L237.8,25.0L237.5,25.3L236.9,28.7L235.9,29.9L234.9,32.5L234.6,32.8L233.2,31.8L234.6,27.6L235.1,25.2L234.7,24.0L233.9,22.9L231.8,22.8L230.1,23.3L229.7,22.7L229.6,21.8L229.2,21.5L226.8,21.6L226.2,21.3L225.7,20.5L225.6,19.8L227.8,19.3L229.7,19.5L232.7,18.2L230.9,13.9L228.4,13.5L227.9,13.0L228.3,12.3L229.6,11.9L231.7,9.7L233.0,9.3L234.5,9.4L234.3,11.7ZM247.3,2.8L247.3,3.2L246.1,5.9L246.1,6.9L244.1,6.8L243.7,6.5L243.4,5.0L243.6,3.3L243.9,2.9L244.5,2.7L245.1,3.0L246.2,2.2L246.7,2.2L247.3,2.8ZM188.9,67.7L187.5,68.1L186.2,68.1L184.0,66.2L183.2,64.9L183.4,64.0L184.3,63.7L186.4,64.1L187.4,65.7L187.5,66.7L187.8,67.1L189.1,67.5L188.9,67.7ZM194.7,69.4L194.5,69.5L193.6,68.9L192.1,66.7L194.5,66.4L195.5,66.6L195.1,67.5L194.7,69.4ZM191.6,60.1L191.3,60.9L193.1,60.9L195.8,61.6L197.4,61.7L198.8,62.5L198.1,64.1L197.2,64.5L196.3,64.6L193.1,63.0L188.9,63.7L188.0,63.5L187.5,63.1L187.3,62.5L187.3,61.4L187.1,61.1L185.6,62.1L184.9,62.0L184.5,61.5L184.3,60.4L184.5,59.0L185.4,56.9L186.9,56.4L189.2,56.7L191.7,57.9L192.5,58.6L192.5,59.2L191.6,60.1ZM199.6,55.1L197.4,55.9L196.6,55.2L196.4,53.1L193.8,52.2L192.6,51.7L191.7,50.7L191.9,50.3L193.6,49.9L196.4,51.8L197.5,53.4L199.6,53.8L199.8,54.0L199.6,55.1ZM104.8,138.7L103.4,138.9L103.4,138.4L105.8,136.2L107.3,135.9L107.8,136.1L106.8,137.3L104.8,138.7ZM141.5,175.2L138.4,175.2L137.4,174.9L136.1,174.2L134.6,169.8L135.1,168.2L135.7,167.5L136.3,166.9L138.0,166.6L139.6,167.4L140.2,168.2L141.5,171.2L141.8,173.8L141.5,175.2ZM125.2,146.4L115.4,148.2L112.1,148.0L111.7,147.2L112.4,146.6L115.1,146.0L116.3,141.7L112.1,139.7L111.9,139.2L112.2,138.2L112.7,137.8L115.2,136.8L116.3,136.6L117.2,136.7L119.0,137.9L121.0,140.3L123.7,140.7L125.5,141.7L125.2,146.4ZM116.5,159.7L117.4,163.8L118.3,166.4L118.3,167.3L117.5,168.5L113.6,170.1L112.2,170.1L112.2,169.8L113.1,168.1L112.3,166.2L112.7,164.8L112.3,164.6L111.5,164.7L108.6,167.0L107.7,167.2L107.6,166.8L108.3,164.9L108.4,163.7L108.8,162.9L109.6,162.2L110.6,161.6L111.3,161.6L112.1,162.1L114.4,160.5L116.5,159.7ZM120.4,163.5L119.9,163.8L118.7,163.7L118.2,163.2L117.9,162.4L117.9,160.9L118.7,159.9L121.8,158.3L120.4,157.8L120.3,157.4L121.2,156.0L124.6,154.0L125.5,153.6L126.4,153.7L124.6,157.3L120.4,163.5ZM114.9,81.5L111.7,87.1L110.6,87.3L109.4,88.7L106.2,90.2L109.1,90.2L109.9,90.8L109.9,91.9L109.3,92.5L105.5,95.1L103.0,96.1L100.3,98.8L98.9,98.8L97.5,100.5L96.3,101.2L95.7,101.2L94.9,100.9L93.2,99.2L96.3,97.6L96.7,96.7L98.8,95.7L98.6,95.4L95.2,94.0L93.9,93.1L94.0,92.6L95.6,91.6L94.8,91.5L94.3,90.9L93.4,90.7L93.1,90.1L93.0,88.8L93.2,87.3L94.2,86.7L94.6,86.1L95.0,85.9L96.5,86.2L98.1,87.3L99.8,86.9L101.9,87.1L102.0,86.8L100.4,84.1L100.7,83.5L101.6,82.9L106.4,80.9L112.4,77.6L113.9,77.1L114.3,77.5L115.0,79.2L114.9,81.5ZM112.8,126.5L112.1,126.9L111.3,126.8L110.3,126.3L109.2,124.8L111.8,123.7L112.9,124.3L113.3,125.1L113.3,125.8L112.8,126.5ZM116.2,109.1L116.1,110.6L115.7,112.2L116.3,114.0L116.4,115.2L117.4,115.7L118.0,116.2L122.6,116.9L126.9,116.7L127.7,117.2L127.8,118.1L127.1,119.0L124.7,120.7L121.8,123.3L120.9,123.9L120.0,123.9L119.4,123.7L118.8,118.9L115.8,119.5L113.2,119.4L111.8,118.9L110.8,117.8L108.9,114.8L103.2,113.7L101.6,112.1L101.1,111.1L101.3,110.6L102.5,109.4L104.0,109.8L104.9,109.6L105.5,109.0L105.5,108.6L104.7,107.6L104.7,107.3L110.5,106.0L110.9,103.9L112.2,103.7L113.6,104.4L115.7,106.5L116.2,109.1ZM90.2,103.4L93.0,105.2L90.8,108.2L87.4,108.2L82.7,106.0L82.7,105.6L83.0,104.9L83.7,104.4L84.5,104.2L85.7,104.6L87.3,104.0L88.7,104.2L90.2,103.4ZM89.2,121.7L88.1,121.8L86.8,121.7L85.9,121.2L85.1,119.2L85.0,118.0L85.3,115.7L85.2,113.1L88.0,113.0L88.8,113.4L89.2,121.3L89.2,121.7ZM85.1,126.5L82.9,126.9L82.2,126.7L82.0,126.2L82.5,125.1L84.2,124.7L85.3,125.3L85.5,125.9L85.1,126.5ZM114.3,218.9L112.3,218.7L110.8,219.3L109.9,219.8L109.0,219.8L106.3,219.9L103.8,219.9L103.4,219.1L103.9,216.5L103.4,215.8L101.0,215.5L100.1,214.9L98.7,213.2L98.4,212.3L98.3,211.2L96.8,209.8L95.1,208.7L94.0,208.6L92.0,210.4L90.3,212.1L91.0,212.9L91.5,214.1L90.5,214.9L87.8,216.8L87.3,217.5L86.6,217.9L85.2,217.4L82.0,217.5L80.5,217.2L78.7,215.8L74.4,214.8L73.6,212.7L72.8,212.3L67.9,208.5L67.3,207.2L67.9,206.5L69.8,205.3L75.9,203.4L76.9,202.7L77.1,202.0L75.2,201.2L73.6,200.4L73.1,199.8L73.0,199.3L74.0,198.7L75.8,198.7L77.2,198.9L78.4,198.4L80.5,197.8L81.8,197.1L83.0,195.3L84.3,193.6L84.4,192.7L85.5,189.5L86.0,188.7L89.9,186.7L90.9,187.8L92.8,188.1L94.6,187.1L96.6,183.8L98.0,183.6L99.6,183.8L102.6,183.4L108.1,181.9L110.6,181.9L114.0,182.6L116.5,182.6L118.8,185.0L120.1,188.7L122.9,192.4L126.7,195.5L126.7,197.4L125.4,198.5L122.6,199.8L122.7,201.2L124.5,200.4L126.0,200.2L129.9,200.4L131.2,201.9L132.1,204.0L132.6,205.7L132.3,207.6L131.3,207.0L130.3,205.3L129.1,204.5L127.7,204.1L128.3,206.4L128.1,209.5L128.7,209.8L130.5,209.9L129.3,213.0L126.8,213.9L123.9,214.2L123.2,215.3L122.7,216.8L121.2,218.9L119.3,220.1L116.8,219.9L114.3,218.9ZM240.3,328.2L238.2,329.3L237.5,330.6L237.0,331.1L235.7,331.4L234.4,331.5L229.3,328.8L228.0,329.0L229.2,327.7L232.4,326.8L234.2,325.5L238.3,326.7L240.3,328.2Z";
const IE_PATH = "M23.2,224.6L23.1,225.5L21.3,224.3L20.4,223.1L15.5,222.5L17.5,221.3L18.6,221.6L22.1,221.6L23.1,222.2L23.2,224.6ZM89.9,186.7L86.0,188.7L85.5,189.5L84.4,192.7L84.3,193.6L83.0,195.3L81.8,197.1L80.5,197.8L78.4,198.4L77.2,198.9L75.8,198.7L74.0,198.7L73.0,199.3L73.1,199.8L73.6,200.4L75.2,201.2L77.1,202.0L76.9,202.7L75.9,203.4L69.8,205.3L67.9,206.5L67.3,207.2L67.9,208.5L72.8,212.3L73.6,212.7L74.4,214.8L78.7,215.8L80.5,217.2L82.0,217.5L85.2,217.4L86.6,217.9L87.3,217.5L87.8,216.8L90.5,214.9L91.5,214.1L91.0,212.9L90.3,212.1L92.0,210.4L94.0,208.6L95.1,208.7L96.8,209.8L98.3,211.2L98.4,212.3L98.7,213.2L100.1,214.9L101.0,215.5L103.4,215.8L103.9,216.5L103.4,219.1L103.8,219.9L106.3,219.9L109.0,219.8L109.9,219.8L110.8,219.3L112.3,218.7L114.3,218.9L115.4,220.1L115.8,221.3L114.1,221.6L112.1,221.4L111.3,222.2L111.2,223.7L111.9,225.6L113.1,226.9L114.1,230.0L115.0,233.3L116.2,235.4L116.5,237.9L116.3,239.1L116.5,241.3L116.0,242.1L116.4,244.2L117.9,248.6L118.6,251.0L119.0,256.2L117.9,258.3L116.5,260.1L115.6,262.3L114.9,264.7L114.4,268.6L111.3,273.2L109.9,274.3L108.4,275.0L111.8,278.1L109.0,279.6L106.0,280.0L102.6,279.2L100.6,279.3L98.7,280.4L98.0,281.0L97.4,280.6L96.1,278.1L95.2,280.7L93.2,281.6L90.0,281.4L84.5,282.1L82.4,282.9L81.5,284.1L80.8,285.5L80.0,286.3L79.0,286.7L74.8,287.7L74.0,288.2L72.0,290.4L69.4,291.7L67.3,292.1L65.4,290.8L64.7,290.0L63.8,289.6L60.9,289.7L61.8,290.1L62.4,291.0L62.6,292.7L62.3,294.5L60.9,295.3L59.2,295.5L56.5,297.3L52.9,297.8L50.9,299.4L39.2,302.2L38.5,302.2L36.9,301.5L35.1,301.2L33.4,301.4L28.4,303.0L26.0,302.7L29.0,298.8L33.2,296.9L33.6,296.3L32.2,296.1L24.5,297.4L21.7,298.6L19.0,298.9L20.2,297.1L23.8,294.7L25.6,293.6L26.8,293.1L28.1,291.7L31.8,290.1L19.9,293.4L16.8,293.0L16.1,292.1L13.7,292.5L12.8,290.3L16.3,286.9L18.4,285.4L21.0,284.6L23.3,283.5L24.2,282.1L23.1,281.7L15.9,282.0L12.4,281.7L12.6,280.6L13.3,279.4L16.8,277.3L18.8,277.0L20.5,277.2L22.2,277.7L23.5,278.5L27.5,278.0L25.9,276.7L25.6,274.0L24.3,273.1L26.0,271.9L27.8,271.1L31.0,268.5L32.1,268.1L38.4,267.5L45.0,266.1L51.7,264.2L48.3,263.2L46.6,261.8L44.0,264.6L42.1,265.7L36.8,266.2L35.1,265.9L32.7,265.1L31.9,265.4L31.2,266.1L27.7,267.4L24.0,267.7L28.3,265.2L33.8,261.0L35.0,259.6L36.8,257.3L36.3,256.2L35.1,255.6L39.1,250.8L40.5,249.9L43.0,249.8L45.0,249.0L45.8,249.0L46.5,248.7L48.1,247.3L45.6,246.4L43.0,245.9L34.9,246.4L33.9,246.3L32.8,245.8L32.2,245.2L31.7,243.5L31.2,243.2L29.3,243.2L27.5,243.7L26.2,243.6L25.0,242.9L27.0,241.2L24.5,240.8L21.9,241.2L19.7,240.7L19.7,239.6L20.7,238.6L19.4,237.6L19.1,236.3L20.5,235.7L21.9,235.9L25.0,234.9L28.8,234.5L25.5,233.6L24.2,232.8L24.1,231.6L24.4,230.6L28.3,228.8L32.3,228.1L31.9,226.9L32.3,225.7L28.2,225.3L24.1,226.2L24.6,223.8L25.5,221.6L25.7,220.3L25.5,218.7L23.6,219.4L23.3,217.2L22.5,215.8L19.7,216.8L19.8,214.8L20.6,213.5L22.1,212.9L23.6,213.2L26.2,213.2L28.9,212.1L32.6,211.9L38.7,212.2L42.8,215.1L43.9,214.6L45.6,212.7L46.4,212.6L52.6,213.3L56.5,214.3L57.5,214.0L56.9,212.1L55.6,210.7L57.3,208.8L59.3,207.6L60.7,207.0L63.9,206.2L65.2,205.5L66.2,203.1L67.6,201.2L59.6,202.2L52.2,199.9L53.4,198.3L55.0,197.3L57.7,196.6L58.0,195.8L59.3,195.0L61.6,193.2L60.8,190.8L61.2,189.0L62.9,187.8L63.4,186.2L64.1,184.9L67.5,184.5L70.7,183.4L71.9,183.5L75.7,183.2L77.0,183.7L76.6,181.6L79.0,181.4L79.9,181.8L80.3,183.2L81.4,184.2L81.6,185.7L80.9,186.9L79.8,187.9L80.8,188.8L79.2,190.6L81.0,189.8L83.6,188.1L83.5,186.7L83.0,185.0L82.2,183.4L82.6,181.7L84.1,180.6L87.9,180.0L86.3,178.1L87.7,177.9L89.3,178.3L91.5,179.9L93.8,181.0L96.2,182.0L93.9,183.9L91.0,185.2L89.9,186.7Z";

const CITIES: Array<{ q: string; display: string; lat: number; lng: number }> = [
  { q: "london", display: "London", lat: 51.5074, lng: -0.1278 },
  { q: "manchester", display: "Manchester", lat: 53.4808, lng: -2.2426 },
  { q: "birmingham", display: "Birmingham", lat: 52.4862, lng: -1.8904 },
  { q: "bristol", display: "Bristol", lat: 51.4545, lng: -2.5879 },
  { q: "leeds", display: "Leeds", lat: 53.8008, lng: -1.5491 },
  { q: "liverpool", display: "Liverpool", lat: 53.4084, lng: -2.9916 },
  { q: "edinburgh", display: "Edinburgh", lat: 55.9533, lng: -3.1883 },
  { q: "glasgow", display: "Glasgow", lat: 55.8642, lng: -4.2518 },
  { q: "newcastle", display: "Newcastle", lat: 54.9783, lng: -1.6178 },
  { q: "sheffield", display: "Sheffield", lat: 53.3811, lng: -1.4701 },
  { q: "nottingham", display: "Nottingham", lat: 52.9548, lng: -1.1581 },
  { q: "cardiff", display: "Cardiff", lat: 51.4816, lng: -3.1791 },
  { q: "brighton", display: "Brighton", lat: 50.8225, lng: -0.1372 },
  { q: "cambridge", display: "Cambridge", lat: 52.2053, lng: 0.1218 },
  { q: "oxford", display: "Oxford", lat: 51.7520, lng: -1.2577 },
  { q: "york", display: "York", lat: 53.96, lng: -1.0873 },
  { q: "bath", display: "Bath", lat: 51.3813, lng: -2.3590 },
  { q: "reading", display: "Reading", lat: 51.4543, lng: -0.9781 },
  { q: "southampton", display: "Southampton", lat: 50.9097, lng: -1.4044 },
  { q: "leicester", display: "Leicester", lat: 52.6369, lng: -1.1398 },
  { q: "clapham", display: "Clapham", lat: 51.4626, lng: -0.1389 },
  { q: "shoreditch", display: "Shoreditch", lat: 51.5246, lng: -0.0786 },
  { q: "peckham", display: "Peckham", lat: 51.4733, lng: -0.0694 },
  { q: "didsbury", display: "Didsbury", lat: 53.4173, lng: -2.2286 },
];

// Very rough postcode-area → (lat, lng, city name) lookup for live preview.
// Real scoring uses postcodes.io; this is just to drive the hero map animation.
const POSTCODE_AREAS: Record<string, { lat: number; lng: number; display: string }> = {
  E: { lat: 51.5255, lng: -0.0352, display: "East London" },
  EC: { lat: 51.5155, lng: -0.0922, display: "City of London" },
  N: { lat: 51.5653, lng: -0.1053, display: "North London" },
  NW: { lat: 51.5416, lng: -0.1935, display: "North West London" },
  SE: { lat: 51.4716, lng: -0.0505, display: "South East London" },
  SW: { lat: 51.4612, lng: -0.1761, display: "South West London" },
  W: { lat: 51.5161, lng: -0.1893, display: "West London" },
  WC: { lat: 51.5165, lng: -0.1258, display: "West Central London" },
  M: { lat: 53.4808, lng: -2.2426, display: "Manchester" },
  B: { lat: 52.4862, lng: -1.8904, display: "Birmingham" },
  BS: { lat: 51.4545, lng: -2.5879, display: "Bristol" },
  LS: { lat: 53.8008, lng: -1.5491, display: "Leeds" },
  L: { lat: 53.4084, lng: -2.9916, display: "Liverpool" },
  EH: { lat: 55.9533, lng: -3.1883, display: "Edinburgh" },
  G: { lat: 55.8642, lng: -4.2518, display: "Glasgow" },
  NE: { lat: 54.9783, lng: -1.6178, display: "Newcastle" },
  S: { lat: 53.3811, lng: -1.4701, display: "Sheffield" },
  NG: { lat: 52.9548, lng: -1.1581, display: "Nottingham" },
  CF: { lat: 51.4816, lng: -3.1791, display: "Cardiff" },
  BN: { lat: 50.8225, lng: -0.1372, display: "Brighton" },
  CB: { lat: 52.2053, lng: 0.1218, display: "Cambridge" },
  OX: { lat: 51.7520, lng: -1.2577, display: "Oxford" },
  YO: { lat: 53.96, lng: -1.0873, display: "York" },
  BA: { lat: 51.3813, lng: -2.359, display: "Bath" },
  RG: { lat: 51.4543, lng: -0.9781, display: "Reading" },
  SO: { lat: 50.9097, lng: -1.4044, display: "Southampton" },
  LE: { lat: 52.6369, lng: -1.1398, display: "Leicester" },
};

function resolveInput(raw: string): { lat: number; lng: number; display: string } | null {
  const q = raw.trim();
  if (!q) return null;

  // Postcode? Letters + digits.
  const pcMatch = q.toUpperCase().match(/^([A-Z]{1,2})\d/);
  if (pcMatch) {
    const hit = POSTCODE_AREAS[pcMatch[1]];
    if (hit) return hit;
  }

  // City / neighbourhood by name.
  const lower = q.toLowerCase();
  const city = CITIES.find(c => c.q === lower) || CITIES.find(c => c.q.startsWith(lower));
  if (city) return { lat: city.lat, lng: city.lng, display: city.display };

  return null;
}

const INTENTS = [
  { id: "moving",   verb: "moving home",         noun: "a place to live" },
  { id: "business", verb: "opening a business",  noun: "a place to trade" },
  { id: "invest",   verb: "property investing",  noun: "a yield decision" },
  { id: "research", verb: "market research",     noun: "a market read" },
] as const;

type IntentId = typeof INTENTS[number]["id"];

const SOURCES = [
  { key: "postcodes", name: "Postcodes.io",  ms: 180 },
  { key: "police",    name: "Police.uk",     ms: 420 },
  { key: "imd",       name: "IMD 2025",      ms: 140 },
  { key: "osm",       name: "OpenStreetMap", ms: 780 },
  { key: "env",       name: "Env. Agency",   ms: 310 },
  { key: "land",      name: "Land Registry", ms: 560 },
  { key: "ofsted",    name: "Ofsted",        ms: 240 },
] as const;

/* ─────── Scoring model (sample numbers, real weights) ─────── */

// Same baseline dimensions for every area · swap to real scoring later.
const SAMPLE_DIMS: Array<{ key: string; label: string; score: number; detail: string; src: string }> = [
  { key: "safety",    label: "Safety & Crime",        score: 72, detail: "84 crimes/12mo; violent 8%; trend falling",          src: "Police.uk" },
  { key: "schools",   label: "Schools & Education",   score: 68, detail: "4 of 5 nearby schools Good or Outstanding",          src: "Ofsted" },
  { key: "transport", label: "Transport & Commute",   score: 88, detail: "4 stations within 2km; Northern Line direct",        src: "OpenStreetMap" },
  { key: "amenities", label: "Daily Amenities",       score: 81, detail: "143 amenities within 1km; 28 restaurants",           src: "OpenStreetMap" },
  { key: "cost",      label: "Cost of Living",        score: 45, detail: "Median £625k; 14% above London median",              src: "Land Registry" },
];

const INTENT_WEIGHTS: Record<IntentId, Record<string, number>> = {
  moving:   { safety: 30, schools: 25, transport: 15, amenities: 15, cost: 15 },
  business: { safety: 15, schools: 0,  transport: 30, amenities: 30, cost: 25 },
  invest:   { safety: 15, schools: 10, transport: 15, amenities: 10, cost: 50 },
  research: { safety: 20, schools: 20, transport: 20, amenities: 20, cost: 20 },
};

const INTENT_LABELS: Record<IntentId, string> = {
  moving: "Strong-Moderate fit",
  business: "Strong fit",
  invest: "Moderate fit",
  research: "Balanced read",
};

const INTENT_NARRATIVES: Record<IntentId, (loc: string) => string> = {
  moving:   (loc) => `${loc} is a strong fit for families moving in. Four of five nearby schools are rated Good or Outstanding by Ofsted. Northern Line access gives 20-minute commutes to Westminster. Main trade-off is cost. Median sale price sits roughly 14% above the London median.`,
  business: (loc) => `${loc} has solid footfall and amenity density for a retail or hospitality business. 143 amenities within 1km, four stations within 2km. Rent and leasehold prices are the constraint. Expect a 25%+ premium vs outer-borough equivalents. Falling crime trend supports evening trade.`,
  invest:   (loc) => `${loc} offers limited yield at current prices. Median sale £625k, median rent £2,100/mo = ~4% gross yield, below the 5.5% London average. Capital growth has been steady at 3-4% YoY over five years. A lower-yield, lower-risk hold rather than a value play.`,
  research: (loc) => `${loc} sits in the upper quartile for transport and amenities, median for safety, below-median for affordability. IMD 2025 decile 6: relatively deprived on income but less so on crime and education. Useful benchmark for comparing inner-London neighbourhoods.`,
};

const INTENT_RECS: Record<IntentId, string[]> = {
  moving: [
    "Prioritise viewings east of the high street for lower median prices.",
    "Research the two Outstanding-rated primaries before shortlisting.",
    "Budget for a 10-15% premium vs neighbouring postcodes.",
  ],
  business: [
    "Target corners with proven foot traffic (high street / park junction).",
    "Budget £80-120/sqft leasehold; expect 6-month fit-out.",
    "Evening licence viable. Crime trend and residential density support.",
  ],
  invest: [
    "Consider 1-bed units over family homes for best gross yield.",
    "Avoid premium corners; peripheral stock outperforms on yield basis.",
    "Minimum 5-year hold to offset transaction + stamp duty drag.",
  ],
  research: [
    "Benchmark against two adjacent postcodes to normalise IMD context.",
    "Pull 5-year trend data for crime + prices before drawing conclusions.",
    "Use LSOA-level data where possible. Ward-level aggregates hide variance.",
  ],
};

function computeScore(intentId: IntentId): number {
  const w = INTENT_WEIGHTS[intentId];
  const total = SAMPLE_DIMS.reduce((s, d) => s + (w[d.key] || 0) * d.score, 0);
  return Math.round(total / 100);
}

/* ─────── Real seeded reports · 4 cities × 4 intents, fetched from live APIs
   See scripts/seed-design-v2.ts for the generator. ─────── */

type RealDim = { label: string; score: number; weight: number; reasoning: string };
type RealIntentReport = { overall: number; dimensions: RealDim[]; summary: string };
type RealLocationReport = {
  key: string; display: string; postcode: string;
  region: string; areaType: string; lsoa: string;
  intents: Record<string, RealIntentReport>;
};
const SAMPLE_REPORTS = SAMPLE_REPORTS_JSON as Record<string, RealLocationReport>;

function resolveSampleKey(raw: string): string | null {
  const q = raw.trim().toUpperCase().replace(/\s+/g, "");
  const m: Record<string, string> = {
    MANCHESTER: "manchester",
    CLAPHAM: "clapham",
    SW40LG: "clapham",
    EDINBURGH: "edinburgh",
    BRISTOL: "bristol",
    BS14DJ: "bristol",
  };
  return m[q] || null;
}

/* ─────── Root ─────── */

export default function DesignV2Client() {
  const [raw, setRaw] = useState("");
  const [intentId, setIntentId] = useState<IntentId>("moving");
  const [showReport, setShowReport] = useState(false);
  const reportRef = useRef<HTMLElement>(null);

  const resolved = useMemo(() => resolveInput(raw), [raw]);
  const intent = INTENTS.find(i => i.id === intentId)!;

  function runEngine() {
    if (!resolved) return;
    setShowReport(true);
    setTimeout(() => {
      reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  return (
    <div className="aiq">
      <Styles />
      <Nav />
      <Hero
        raw={raw}
        setRaw={setRaw}
        intentId={intentId}
        setIntentId={setIntentId}
        resolved={resolved}
        intent={intent}
        onRun={runEngine}
      />
      <SampleReport
        ref={reportRef}
        resolved={resolved}
        intent={intent}
        intentId={intentId}
        shown={showReport && !!resolved}
        raw={raw}
      />
      <HowItWorks />
      <IntentsSection />
      <AudiencesSection />
      <ForBusinessesSection />
      <FinalCTA />
      <Footer />
    </div>
  );
}

/* ─────── Hero ─────── */

function Hero({
  raw, setRaw,
  intentId, setIntentId,
  resolved, intent,
  onRun,
}: {
  raw: string;
  setRaw: (v: string) => void;
  intentId: IntentId;
  setIntentId: (id: IntentId) => void;
  resolved: { lat: number; lng: number; display: string } | null;
  intent: (typeof INTENTS)[number];
  onRun: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <section style={{
      position: "relative",
      background: "var(--bg)",
      borderBottom: "1px solid var(--border)",
    }}>
      {/* Ambient chartreuse wash · centered */}
      <div style={{
        position: "absolute", inset: 0, overflow: "hidden",
        pointerEvents: "none", zIndex: 0,
      }}>
        <div style={{
          position: "absolute", top: -260, left: "50%",
          transform: "translateX(-50%)",
          width: 960, height: 740,
          background: "radial-gradient(ellipse at center, rgba(212,243,58,0.22) 0%, rgba(212,243,58,0) 58%)",
        }} />
      </div>

      <div style={{
        maxWidth: 780, margin: "0 auto",
        padding: "112px 40px 112px",
        position: "relative", zIndex: 1,
        textAlign: "center",
      }}>
        <HeroEyebrow />

        <h1 style={{
          fontFamily: "var(--display)", fontWeight: 400,
          fontSize: "clamp(2.6rem, 5.4vw, 4.6rem)",
          lineHeight: 1.03, letterSpacing: "-0.025em",
          color: "var(--ink-deep)",
          margin: "28px 0 0",
          animation: "aiq-fade-up 800ms cubic-bezier(0.16,1,0.3,1) both",
        }}>
          An intelligence report for{" "}
          <span style={{
            fontStyle: "italic", color: "var(--ink)",
            borderBottom: "3px solid var(--signal)", paddingBottom: 2,
          }}>every UK postcode</span>.
        </h1>

        <p style={{
          fontFamily: "var(--sans)", fontSize: 19, lineHeight: 1.55,
          color: "var(--text-2)", letterSpacing: "-0.005em",
          margin: "24px auto 40px",
          maxWidth: "34em",
          animation: "aiq-fade-up 800ms cubic-bezier(0.16,1,0.3,1) 100ms both",
        }}>
          Type a place. Pick why you're looking. Seven public datasets do the rest.
        </p>

        {/* Form · centered */}
        <div style={{
          display: "flex", justifyContent: "center",
          gap: 10, flexWrap: "wrap",
          animation: "aiq-fade-up 800ms cubic-bezier(0.16,1,0.3,1) 180ms both",
        }}>
          <div style={{
            position: "relative", width: "100%", maxWidth: 360,
            border: `1px solid ${resolved ? "var(--ink)" : "var(--border)"}`,
            borderRadius: 8,
            background: "var(--bg)",
            transition: "border-color 160ms",
          }}>
            <input
              ref={inputRef}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && resolved) onRun(); }}
              placeholder="e.g. Manchester, SW4 0LG"
              style={{
                width: "100%",
                fontFamily: "var(--sans)", fontSize: 16, fontWeight: 500,
                color: "var(--ink-deep)", letterSpacing: "-0.01em",
                padding: "14px 18px", border: "none", outline: "none",
                borderRadius: 8, background: "transparent",
                textAlign: "left",
              }}
            />
          </div>
          <button
            disabled={!resolved}
            onClick={onRun}
            style={{
              fontFamily: "var(--sans)", fontSize: 15, fontWeight: 600,
              color: resolved ? "var(--signal-ink)" : "var(--text-4)",
              background: resolved ? "var(--signal)" : "var(--bg-off)",
              border: `1px solid ${resolved ? "var(--ink-deep)" : "var(--border)"}`,
              borderRadius: 8, padding: "0 24px",
              cursor: resolved ? "pointer" : "not-allowed",
              letterSpacing: "-0.005em",
              display: "inline-flex", alignItems: "center", gap: 8,
              transition: "all 180ms cubic-bezier(0.16,1,0.3,1)",
              minHeight: 48,
            }}
            onMouseEnter={(e) => {
              if (!resolved) return;
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 8px 20px rgba(6,42,30,0.14)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            Get report
            <span style={{ fontSize: 16 }}>→</span>
          </button>
        </div>

        {/* Intent tabs · centered */}
        <div style={{
          marginTop: 28,
          animation: "aiq-fade-up 800ms cubic-bezier(0.16,1,0.3,1) 260ms both",
        }}>
          <div style={{
            fontFamily: "var(--mono)", fontSize: 10,
            letterSpacing: "0.24em", textTransform: "uppercase",
            color: "var(--text-3)", marginBottom: 12,
          }}>Pick why you're looking</div>
          <div style={{
            display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap",
          }}>
            {INTENTS.map((it) => {
              const active = it.id === intentId;
              return (
                <button
                  key={it.id}
                  onClick={() => setIntentId(it.id)}
                  style={{
                    fontFamily: "var(--sans)", fontSize: 13, fontWeight: 500,
                    color: active ? "var(--signal)" : "var(--text-2)",
                    background: active ? "var(--bg-ink)" : "transparent",
                    border: `1px solid ${active ? "var(--ink-deep)" : "var(--border)"}`,
                    borderRadius: 999, padding: "7px 16px",
                    cursor: "pointer",
                    letterSpacing: "-0.005em",
                    transition: "all 160ms",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.color = "var(--ink-deep)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.color = "var(--text-2)";
                  }}
                >
                  {it.verb}
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}

/* ─────── Hero pieces ─────── */

function HeroEyebrow() {
  return (
    <div style={{
      fontFamily: "var(--mono)", fontSize: 11,
      letterSpacing: "0.22em", textTransform: "uppercase",
      color: "var(--text-3)",
      display: "inline-flex", alignItems: "center", gap: 10,
      animation: "aiq-fade-up 700ms cubic-bezier(0.16,1,0.3,1) both",
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: 999,
        background: "var(--signal)",
        boxShadow: "0 0 0 4px rgba(212,243,58,0.22)",
        animation: "aiq-pulse-dot 1800ms ease-in-out infinite",
      }} />
      <span>UK area intelligence</span>
    </div>
  );
}

function HeroForm({
  inputRef, raw, setRaw, resolved, onRun,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  raw: string;
  setRaw: (v: string) => void;
  resolved: { lat: number; lng: number; display: string } | null;
  onRun: () => void;
}) {
  return (
    <div style={{
      animation: "aiq-fade-up 800ms cubic-bezier(0.16,1,0.3,1) 180ms both",
    }}>
      <div style={{
        display: "flex", alignItems: "stretch",
        gap: 10, maxWidth: 520,
      }}>
        <div style={{
          flex: 1, position: "relative",
          border: `1px solid ${resolved ? "var(--ink)" : "var(--border)"}`,
          borderRadius: 8,
          background: "var(--bg)",
          transition: "border-color 160ms",
        }}>
          <input
            ref={inputRef}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && resolved) onRun();
            }}
            placeholder="e.g. Manchester, SW4 0LG, Bristol"
            style={{
              width: "100%",
              fontFamily: "var(--sans)", fontSize: 16, fontWeight: 500,
              color: "var(--ink-deep)", letterSpacing: "-0.01em",
              padding: "14px 16px", border: "none", outline: "none",
              borderRadius: 8, background: "transparent",
            }}
          />
          {resolved && (
            <span style={{
              position: "absolute", right: 14, top: "50%",
              transform: "translateY(-50%)",
              fontFamily: "var(--mono)", fontSize: 10,
              color: "var(--ink)", fontWeight: 500,
              letterSpacing: "0.1em", textTransform: "uppercase",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6.2l2.3 2.3 4.8-4.8" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              found
            </span>
          )}
        </div>
        <button
          disabled={!resolved}
          onClick={onRun}
          style={{
            fontFamily: "var(--sans)", fontSize: 15, fontWeight: 600,
            color: resolved ? "var(--signal-ink)" : "var(--text-4)",
            background: resolved ? "var(--signal)" : "var(--bg-off)",
            border: `1px solid ${resolved ? "var(--ink-deep)" : "var(--border)"}`,
            borderRadius: 8, padding: "0 22px",
            cursor: resolved ? "pointer" : "not-allowed",
            letterSpacing: "-0.005em",
            display: "inline-flex", alignItems: "center", gap: 8,
            transition: "all 180ms cubic-bezier(0.16,1,0.3,1)",
          }}
          onMouseEnter={(e) => {
            if (!resolved) return;
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 8px 20px rgba(6,42,30,0.14)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          Get report
          <span style={{ fontSize: 16 }}>→</span>
        </button>
      </div>
      <div style={{
        fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-3)",
        letterSpacing: "0.14em", textTransform: "uppercase",
        marginTop: 10,
      }}>
        3 free reports / month · no card required
      </div>
    </div>
  );
}

/* ─────── PullQuote · editorial sample of engine voice ─────── */

const PULLQUOTES: Record<IntentId, { body: string; meta: string }> = {
  moving: {
    body: "Strong fit for families. Four of five nearby schools are rated Good or Outstanding. The trade-off is cost: roughly 14% above the London median.",
    meta: "SW4 0LG · scored for moving home · 71 / 100",
  },
  business: {
    body: "Solid foot traffic and amenity density for a retail or hospitality lease. Falling crime trend supports evening trade, but expect a 25% rent premium over outer postcodes.",
    meta: "SW4 0LG · scored for opening a business · 73 / 100",
  },
  invest: {
    body: "Limited yield at current prices. Median sale £625k, median rent £2,100/mo gives ~4% gross, below London average. A low-risk hold rather than a value play.",
    meta: "SW4 0LG · scored for property investing · 61 / 100",
  },
  research: {
    body: "Upper quartile for transport and amenities, median for safety, below-median for affordability. IMD 2025 decile 6: useful benchmark for inner-London neighbourhoods.",
    meta: "SW4 0LG · scored for market research · 71 / 100",
  },
};

function PullQuote({ intent }: { intent: (typeof INTENTS)[number] }) {
  const q = PULLQUOTES[intent.id];
  return (
    <div style={{
      marginTop: 56,
      paddingTop: 28,
      borderTop: "1px solid var(--border)",
      animation: "aiq-fade-up 900ms cubic-bezier(0.16,1,0.3,1) 460ms both",
      maxWidth: 620,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        fontFamily: "var(--mono)", fontSize: 10,
        color: "var(--text-3)", letterSpacing: "0.14em", textTransform: "uppercase",
        marginBottom: 14,
      }}>
        <span style={{
          width: 14, height: 1, background: "var(--ink)", display: "inline-block",
        }} />
        what a report reads like
      </div>

      <blockquote
        key={`pq-${intent.id}`}
        style={{
          margin: 0,
          fontFamily: "var(--display)", fontStyle: "italic",
          fontSize: "clamp(1.35rem, 1.8vw, 1.65rem)",
          lineHeight: 1.45, letterSpacing: "-0.012em",
          color: "var(--ink-deep)",
          animation: "aiq-fade-up 520ms cubic-bezier(0.16,1,0.3,1) both",
          position: "relative",
          paddingLeft: 20,
        }}
      >
        <span style={{
          position: "absolute", left: 0, top: "-0.2em",
          fontFamily: "var(--display)", fontStyle: "normal",
          fontSize: "2.4em", lineHeight: 1, color: "var(--signal)",
          fontWeight: 400,
        }}>
          &ldquo;
        </span>
        {q.body}
      </blockquote>

      <div style={{
        marginTop: 16, paddingLeft: 20,
        fontFamily: "var(--mono)", fontSize: 10,
        color: "var(--text-3)", letterSpacing: "0.08em",
      }}>
        {q.meta}
      </div>
    </div>
  );
}

/* ─────── Eyebrow · tiny status line, no pill ─────── */

function Eyebrow() {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      fontFamily: "var(--mono)", fontSize: 10,
      color: "var(--text-3)", letterSpacing: "0.14em", textTransform: "uppercase",
      animation: "aiq-fade-up 900ms cubic-bezier(0.16,1,0.3,1) both",
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%",
        background: "var(--signal)", border: "1px solid var(--ink-deep)",
        animation: "aiq-pulse-dot 2.4s ease-in-out infinite",
      }} />
      Area intelligence · engine v1.2 · live
      <span style={{ color: "var(--text-4)" }}>/</span>
      <span style={{ color: "var(--text-3)" }}>42,640 UK areas</span>
    </div>
  );
}

/* ─────── Inline input baked into the serif sentence ─────── */

const InlineInput = forwardRef<
  HTMLInputElement,
  {
    value: string;
    onChange: (v: string) => void;
    onSubmit: () => void;
    ghost: string;
    resolved: { display: string } | null;
  }
>(function InlineInputInner({ value, onChange, onSubmit, ghost, resolved }, ref) {
    const sizerRef = useRef<HTMLSpanElement>(null);
    const [width, setWidth] = useState(0);

    useEffect(() => {
      if (sizerRef.current) {
        const w = sizerRef.current.offsetWidth;
        setWidth(Math.max(w, 40));
      }
    }, [value, ghost]);

    const display = value || ghost;

    return (
      <span style={{
        position: "relative", display: "inline-block",
        verticalAlign: "baseline",
      }}>
        {/* Sizer · invisible, measures width */}
        <span
          ref={sizerRef}
          aria-hidden
          style={{
            position: "absolute", visibility: "hidden", whiteSpace: "pre",
            fontFamily: "var(--display)", fontStyle: value ? "normal" : "italic",
            fontSize: "inherit", fontWeight: "inherit", letterSpacing: "inherit",
            paddingRight: 4,
          }}
        >
          {display || " "}
        </span>

        {/* Actual input */}
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onSubmit(); }}
          spellCheck={false}
          autoComplete="off"
          style={{
            width: width,
            background: "transparent",
            border: "none",
            borderBottom: "2px solid var(--signal)",
            outline: "none",
            padding: "0 2px 2px",
            fontFamily: "var(--display)",
            fontStyle: "normal",
            fontSize: "inherit",
            fontWeight: 400,
            letterSpacing: "inherit",
            color: "var(--ink-deep)",
            caretColor: "var(--ink-deep)",
            textAlign: "left",
          }}
        />

        {/* Ghost placeholder (italic, faded) · shown only when empty */}
        {!value && (
          <span
            aria-hidden
            style={{
              position: "absolute", left: 2, top: 0, pointerEvents: "none",
              fontFamily: "var(--display)", fontStyle: "italic",
              color: "var(--text-4)", opacity: 0.55,
              fontSize: "inherit", fontWeight: 400, letterSpacing: "inherit",
              transition: "opacity 220ms",
            }}
          >
            {ghost}
          </span>
        )}

        {/* Resolved chip · little confirmation that we know where this is */}
        {resolved && (
          <span style={{
            position: "absolute", right: -10, top: "-1.2em",
            transform: "translate(100%, 0)",
            fontFamily: "var(--mono)", fontSize: 10,
            color: "var(--ink)", background: "var(--signal-dim)",
            padding: "2px 8px", borderRadius: 999,
            whiteSpace: "nowrap",
            letterSpacing: "0.02em",
            animation: "aiq-fade-up 320ms cubic-bezier(0.16,1,0.3,1) both",
          }}>
            ✓ {resolved.display}
          </span>
        )}
      </span>
    );
  }
);
InlineInput.displayName = "InlineInput";

/* ─────── Intent strip · horizontal tab row, always visible ─────── */

function IntentStrip({
  intentId, onPick,
}: {
  intentId: IntentId;
  onPick: (id: IntentId) => void;
}) {
  return (
    <div style={{
      marginTop: -12, marginBottom: 28,
      animation: "aiq-fade-up 900ms cubic-bezier(0.16,1,0.3,1) 150ms both",
    }}>
      {/* Thin hairline divider + mono label */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        marginBottom: 8,
      }}>
        <span style={{
          width: 16, height: 1, background: "var(--ink)", flexShrink: 0,
        }} />
        <span style={{
          fontFamily: "var(--mono)", fontSize: 9,
          color: "var(--text-3)", letterSpacing: "0.16em",
          textTransform: "uppercase", fontWeight: 500,
        }}>
          re-score for
        </span>
      </div>

      {/* Tab row */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 2,
      }}>
        {INTENTS.map((it, i) => {
          const active = it.id === intentId;
          return (
            <button
              key={it.id}
              onClick={() => onPick(it.id)}
              style={{
                display: "inline-flex", alignItems: "baseline", gap: 7,
                padding: "6px 12px 8px",
                border: "none",
                background: active ? "var(--bg-ink)" : "transparent",
                borderRadius: 3,
                cursor: "pointer",
                color: active ? "var(--signal)" : "var(--text-3)",
                transition: "color 160ms, background 160ms",
                position: "relative",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.color = "var(--ink-deep)";
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.color = "var(--text-3)";
              }}
            >
              <span style={{
                fontFamily: "var(--mono)", fontSize: 8, fontWeight: 500,
                color: active ? "var(--signal)" : "var(--text-4)",
                letterSpacing: "0.08em",
                transform: "translateY(-0.15em)",
              }}>
                0{i + 1}
              </span>
              <span style={{
                fontFamily: "var(--display)", fontStyle: "italic",
                fontSize: 16, fontWeight: 400,
                lineHeight: 1.1, letterSpacing: "-0.01em",
              }}>
                {it.verb}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}


/* ─────── Engine panel · map + source tape ─────── */

function EnginePanel({
  resolved, intent, onPick,
}: {
  resolved: { lat: number; lng: number; display: string } | null;
  intent: (typeof INTENTS)[number];
  onPick: (q: string) => void;
}) {
  // Animate source tape as a "run" whenever resolved changes.
  const [runId, setRunId] = useState(0);
  useEffect(() => {
    if (resolved) setRunId(id => id + 1);
  }, [resolved?.display]);

  return (
    <aside className="aiq-engine" style={{
      position: "sticky", top: 92,
      display: "flex", flexDirection: "column", gap: 20,
      animation: "aiq-fade-up 900ms cubic-bezier(0.16,1,0.3,1) 420ms both",
    }}>
      {/* Status line · loose, no panel */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        fontFamily: "var(--mono)", fontSize: 10,
        color: "var(--text-3)", letterSpacing: "0.14em", textTransform: "uppercase",
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: resolved ? "var(--signal)" : "var(--border)",
            border: "1px solid var(--ink-deep)",
            animation: resolved ? "aiq-pulse-dot 1.4s ease-in-out infinite" : "none",
          }} />
          Engine · {resolved ? "querying…" : "idle"}
        </span>
        <span style={{ color: "var(--text-4)" }}>
          7 datasets · for {intent.verb}
        </span>
      </div>

      {/* Map · no card */}
      <UKMap resolved={resolved} onPick={onPick} />

      {/* Source tape · loose rows */}
      <div style={{ paddingTop: 8 }}>
        {SOURCES.map((s, i) => (
          <SourceRow key={`${s.key}-${runId}`} source={s} index={i} active={!!resolved} />
        ))}
      </div>

      {/* Footer line · loose */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        paddingTop: 4,
      }}>
        <span style={{
          fontFamily: "var(--mono)", fontSize: 9,
          color: "var(--text-3)", letterSpacing: "0.08em",
        }}>
          {resolved ? `LSOA → ${resolved.display.toUpperCase()}` : "awaiting input"}
        </span>
        <span style={{
          fontFamily: "var(--mono)", fontSize: 9, fontWeight: 500,
          color: resolved ? "var(--ink)" : "var(--text-4)",
          letterSpacing: "0.06em",
        }}>
          {resolved ? "~ 2.6s" : "—"}
        </span>
      </div>
    </aside>
  );
}

/* ─────── UK map · real Natural Earth coastline + interactions ─────── */

// Featured cities to render as hoverable markers.
const MAP_CITIES: Array<{
  name: string;
  lat: number;
  lng: number;
  score: number;  // sample score for hover-tip; swap for live data later
}> = [
  { name: "London",     lat: 51.5074, lng: -0.1278, score: 72 },
  { name: "Manchester", lat: 53.4808, lng: -2.2426, score: 68 },
  { name: "Birmingham", lat: 52.4862, lng: -1.8904, score: 61 },
  { name: "Bristol",    lat: 51.4545, lng: -2.5879, score: 75 },
  { name: "Leeds",      lat: 53.8008, lng: -1.5491, score: 64 },
  { name: "Liverpool",  lat: 53.4084, lng: -2.9916, score: 59 },
  { name: "Edinburgh",  lat: 55.9533, lng: -3.1883, score: 79 },
  { name: "Glasgow",    lat: 55.8642, lng: -4.2518, score: 63 },
  { name: "Newcastle",  lat: 54.9783, lng: -1.6178, score: 66 },
  { name: "Sheffield",  lat: 53.3811, lng: -1.4701, score: 62 },
  { name: "Cardiff",    lat: 51.4816, lng: -3.1791, score: 70 },
  { name: "Brighton",   lat: 50.8225, lng: -0.1372, score: 77 },
  { name: "Belfast",    lat: 54.5973, lng: -5.9301, score: 60 },
];

function UKMap({
  resolved, onPick,
}: {
  resolved: { lat: number; lng: number; display: string } | null;
  onPick: (q: string) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number; lat: number; lng: number } | null>(null);
  const [hoverCity, setHoverCity] = useState<string | null>(null);

  const VB_W = MAP_VB.w, VB_H = MAP_VB.h;
  const { minLat, maxLat, minLng, maxLng } = UK_BOUNDS;

  function latLngToXY(lat: number, lng: number) {
    const x = ((lng - minLng) / (maxLng - minLng)) * VB_W;
    const y = VB_H - ((lat - minLat) / (maxLat - minLat)) * VB_H;
    return { x, y };
  }
  function xyToLatLng(x: number, y: number) {
    const lng = (x / VB_W) * (maxLng - minLng) + minLng;
    const lat = ((VB_H - y) / VB_H) * (maxLat - minLat) + minLat;
    return { lat, lng };
  }

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * VB_W;
    const y = ((e.clientY - rect.top) / rect.height) * VB_H;
    const { lat, lng } = xyToLatLng(x, y);
    setCursor({ x, y, lat, lng });
  }

  function handleLeave() {
    setCursor(null);
    setHoverCity(null);
  }

  function handleClick() {
    if (!cursor) return;
    // Snap to nearest featured city within ~70mi (rough degrees)
    let best: (typeof MAP_CITIES)[number] | null = null;
    let bestDist = Infinity;
    for (const c of MAP_CITIES) {
      const dx = c.lng - cursor.lng, dy = c.lat - cursor.lat;
      const d = dx * dx + dy * dy;
      if (d < bestDist) { bestDist = d; best = c; }
    }
    if (best && bestDist < 1.5) onPick(best.name);
  }

  const pin = resolved ? latLngToXY(resolved.lat, resolved.lng) : null;

  // RAG colour for city markers (sample scores)
  function rag(score: number) {
    if (score >= 70) return "var(--signal)";
    if (score >= 55) return "#E8D84A";
    return "#E97451";
  }

  return (
    <div className="aiq-map" style={{
      position: "relative",
      width: "100%",
      aspectRatio: `${VB_W}/${VB_H}`,
      overflow: "hidden",
    }}>
      {/* Very subtle grid wash · floats, no card */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.4,
        backgroundImage:
          "linear-gradient(to right, rgba(10,77,58,0.04) 1px, transparent 1px)," +
          "linear-gradient(to bottom, rgba(10,77,58,0.04) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
        maskImage: "radial-gradient(circle at center, black 40%, transparent 80%)",
        WebkitMaskImage: "radial-gradient(circle at center, black 40%, transparent 80%)",
      }} />

      <svg
        ref={svgRef}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        onClick={handleClick}
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          cursor: cursor ? "crosshair" : "default",
        }}
      >
        {/* Soft drop shadow (filter) */}
        <defs>
          <filter id="uk-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="1.2" />
          </filter>
          <linearGradient id="uk-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0C5B42" />
            <stop offset="100%" stopColor="#0A4D3A" />
          </linearGradient>
        </defs>

        {/* Ireland · neutral tone, non-interactive */}
        <path
          d={IE_PATH}
          fill="#E4EAE3"
          stroke="#C8D2C6"
          strokeWidth="0.5"
          strokeLinejoin="round"
        />
        <text
          x="60" y="255"
          fontFamily="var(--mono)" fontSize="6"
          fill="var(--text-4)" letterSpacing="1.2" textAnchor="middle"
          pointerEvents="none"
        >
          IE
        </text>

        {/* UK · main body, forest fill */}
        <g filter="url(#uk-shadow)" opacity="0.12">
          <path d={UK_PATH} fill="#0A4D3A" />
        </g>
        <path
          d={UK_PATH}
          fill="url(#uk-fill)"
          stroke="var(--ink-deep)"
          strokeWidth="0.6"
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{ transition: "fill 260ms" }}
        />

        {/* Cursor crosshair (subtle) */}
        {cursor && !pin && (
          <g pointerEvents="none" opacity="0.55">
            <line x1={cursor.x} y1="0" x2={cursor.x} y2={VB_H}
              stroke="var(--ink)" strokeWidth="0.4" strokeDasharray="2 3" />
            <line x1="0" y1={cursor.y} x2={VB_W} y2={cursor.y}
              stroke="var(--ink)" strokeWidth="0.4" strokeDasharray="2 3" />
          </g>
        )}

        {/* City markers */}
        {MAP_CITIES.map((c) => {
          const { x, y } = latLngToXY(c.lat, c.lng);
          const isHover = hoverCity === c.name;
          const isPinned = !!resolved && Math.abs(resolved.lat - c.lat) < 0.05 && Math.abs(resolved.lng - c.lng) < 0.05;
          if (isPinned) return null; // hide marker under pin
          return (
            <g key={c.name} style={{ cursor: "pointer" }}
               onMouseEnter={() => setHoverCity(c.name)}
               onMouseLeave={() => setHoverCity(null)}
               onClick={(e) => { e.stopPropagation(); onPick(c.name); }}
            >
              {/* Hit target (larger, invisible) */}
              <circle cx={x} cy={y} r="10" fill="transparent" />
              {/* Outer halo on hover */}
              <circle cx={x} cy={y} r={isHover ? "6" : "0"} fill="var(--signal)" opacity="0.35"
                style={{ transition: "r 200ms cubic-bezier(0.16,1,0.3,1)" }}
              />
              {/* Dot */}
              <circle
                cx={x} cy={y} r={isHover ? "3.6" : "2.6"}
                fill={rag(c.score)}
                stroke="var(--ink-deep)" strokeWidth="0.8"
                style={{ transition: "r 180ms cubic-bezier(0.16,1,0.3,1)" }}
              />
              {/* Label · only on hover */}
              {isHover && (
                <g transform={`translate(${x + 8}, ${y - 10})`} pointerEvents="none">
                  <rect x="0" y="-8" rx="3" ry="3"
                    width={c.name.length * 5.2 + 34} height="14"
                    fill="var(--ink-deep)"
                  />
                  <text x="6" y="2" fontFamily="var(--mono)" fontSize="8" fill="#fff" letterSpacing="0.4">
                    {c.name.toUpperCase()}
                  </text>
                  <text
                    x={c.name.length * 5.2 + 28} y="2"
                    fontFamily="var(--mono)" fontSize="8"
                    fill="var(--signal)" textAnchor="end" letterSpacing="0.4"
                  >
                    {c.score}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Resolved pin */}
        {pin && (
          <g style={{ transition: "transform 700ms cubic-bezier(0.16,1,0.3,1)" }} pointerEvents="none">
            <circle
              cx={pin.x} cy={pin.y} r="8"
              fill="none" stroke="var(--signal)" strokeWidth="1.4"
              style={{ transformOrigin: `${pin.x}px ${pin.y}px`, animation: "aiq-ring-pulse 2s ease-out infinite" }}
            />
            <circle
              cx={pin.x} cy={pin.y} r="8"
              fill="none" stroke="var(--signal)" strokeWidth="1.2"
              style={{ transformOrigin: `${pin.x}px ${pin.y}px`, animation: "aiq-ring-pulse 2s ease-out infinite 0.6s" }}
            />
            <line x1={pin.x - 12} y1={pin.y} x2={pin.x - 5} y2={pin.y} stroke="var(--ink-deep)" strokeWidth="0.9" />
            <line x1={pin.x + 5} y1={pin.y} x2={pin.x + 12} y2={pin.y} stroke="var(--ink-deep)" strokeWidth="0.9" />
            <line x1={pin.x} y1={pin.y - 12} x2={pin.x} y2={pin.y - 5} stroke="var(--ink-deep)" strokeWidth="0.9" />
            <line x1={pin.x} y1={pin.y + 5} x2={pin.x} y2={pin.y + 12} stroke="var(--ink-deep)" strokeWidth="0.9" />
            <circle cx={pin.x} cy={pin.y} r="4" fill="var(--signal)" stroke="var(--ink-deep)" strokeWidth="1.1" />
            {(() => {
              const labelText = resolved!.display.toUpperCase();
              const labelW = labelText.length * 5.4 + 14;
              const flipLeft = pin.x > VB_W * 0.58;
              const labelOffsetX = flipLeft ? -labelW - 10 : 10;
              return (
                <g transform={`translate(${pin.x + labelOffsetX}, ${pin.y - 12})`}>
                  <rect x="0" y="-8" rx="3" ry="3"
                    width={labelW} height="14"
                    fill="var(--ink-deep)"
                  />
                  <text x="7" y="2" fontFamily="var(--mono)" fontSize="8" fill="var(--signal)" letterSpacing="0.5">
                    {labelText}
                  </text>
                </g>
              );
            })()}
          </g>
        )}
      </svg>

      {/* Live cursor readout (top-left) */}
      <div style={{
        position: "absolute", top: 10, left: 10,
        fontFamily: "var(--mono)", fontSize: 9,
        color: "var(--text-3)", letterSpacing: "0.08em",
        background: "rgba(255,255,255,0.9)",
        border: "1px solid var(--border)",
        borderRadius: 4, padding: "3px 6px",
        pointerEvents: "none",
        opacity: cursor ? 1 : 0.6,
        transition: "opacity 160ms",
        fontVariantNumeric: "tabular-nums",
      }}>
        {cursor
          ? `${cursor.lat.toFixed(2)}°N  ${cursor.lng >= 0 ? "+" : ""}${cursor.lng.toFixed(2)}°`
          : "hover map"}
      </div>

      {/* Help hint (bottom-right) */}
      <div style={{
        position: "absolute", bottom: 8, right: 10,
        fontFamily: "var(--mono)", fontSize: 8,
        color: "var(--text-4)", letterSpacing: "0.14em",
        textTransform: "uppercase",
        pointerEvents: "none",
      }}>
        {resolved ? resolved.display : "click a city to score"}
      </div>
    </div>
  );
}

/* ─────── Source row ─────── */

function SourceRow({
  source, index, active,
}: {
  source: (typeof SOURCES)[number];
  index: number;
  active: boolean;
}) {
  const [done, setDone] = useState(false);
  const startDelay = 120 + index * 180;
  const runDuration = Math.max(350, source.ms);

  useEffect(() => {
    if (!active) { setDone(false); return; }
    const t = setTimeout(() => setDone(true), startDelay + runDuration);
    return () => clearTimeout(t);
  }, [active, startDelay, runDuration]);

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "14px 1fr 46px",
      alignItems: "center", gap: 10,
      padding: "7px 0",
      borderBottom: index < SOURCES.length - 1 ? "1px solid var(--border-dim)" : "none",
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: "50%",
        background: active && !done ? "var(--signal)" : active && done ? "var(--ink)" : "var(--border)",
        border: active ? "1px solid var(--ink-deep)" : "1px solid var(--border)",
        animation: active && !done ? "aiq-pulse-dot 1s ease-in-out infinite" : "none",
        transition: "background 180ms",
      }} />
      <div style={{ overflow: "hidden" }}>
        <div style={{
          fontFamily: "var(--sans)", fontSize: 12, fontWeight: 500,
          color: "var(--text)", letterSpacing: "-0.005em",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          {source.name}
          {active && (
            <span style={{
              fontFamily: "var(--mono)", fontSize: 9, color: done ? "var(--ink)" : "var(--text-3)",
            }}>
              {done ? "✓" : "…"}
            </span>
          )}
        </div>
        {/* Progress bar */}
        <div style={{
          marginTop: 4, height: 2, background: "var(--border-dim)", borderRadius: 2, overflow: "hidden",
        }}>
          <div style={{
            height: "100%", background: done ? "var(--ink)" : "var(--signal)",
            width: active ? "100%" : "0%",
            transition: active
              ? `width ${runDuration}ms cubic-bezier(0.16,1,0.3,1) ${startDelay}ms, background 240ms`
              : "none",
          }} />
        </div>
      </div>
      <div style={{
        fontFamily: "var(--mono)", fontSize: 10,
        color: active && done ? "var(--ink)" : "var(--text-4)",
        textAlign: "right", letterSpacing: "0.04em",
        fontVariantNumeric: "tabular-nums",
      }}>
        {active && done ? `${source.ms}ms` : "—"}
      </div>
    </div>
  );
}

/* ─────── Sample Report · revealed when "Run the engine" is pressed ─────── */

const SampleReport = forwardRef<
  HTMLElement,
  {
    resolved: { lat: number; lng: number; display: string } | null;
    intent: (typeof INTENTS)[number];
    intentId: IntentId;
    shown: boolean;
    raw: string;
  }
>(function SampleReport({ resolved, intent, intentId, shown, raw }, ref) {
  // Look up real seeded data first, fall back to mock if no match.
  const sampleKey = raw ? resolveSampleKey(raw) : null;
  const realLoc = sampleKey ? SAMPLE_REPORTS[sampleKey] : undefined;
  const realReport = realLoc?.intents?.[intentId];
  const isReal = !!realReport;

  const score = realReport?.overall ?? computeScore(intentId);
  const label = INTENT_LABELS[intentId];
  const narrative = realReport?.summary
    ?? (resolved ? INTENT_NARRATIVES[intentId](resolved.display) : "");

  // Build a unified dimension list from real or mock data.
  type UniDim = { key: string; label: string; score: number; weight: number; detail: string };
  const allDims: UniDim[] = realReport
    ? realReport.dimensions.map((d, i) => ({
        key: `real-${i}`,
        label: d.label,
        score: d.score,
        weight: d.weight,
        detail: d.reasoning,
      }))
    : SAMPLE_DIMS.map((d) => ({
        key: d.key,
        label: d.label,
        score: d.score,
        weight: INTENT_WEIGHTS[intentId][d.key] || 0,
        detail: d.detail,
      }));

  // Teaser: only the 3 highest-weighted dimensions (drop zero-weight first).
  const rankedDims = allDims
    .slice()
    .filter((d) => d.weight > 0)
    .sort((a, b) => b.weight - a.weight);
  const topDims = rankedDims.slice(0, 3);
  const hiddenCount = allDims.length - topDims.length;

  function rag(s: number) {
    if (s >= 70) return "var(--ink)";
    if (s >= 55) return "#B59A2A";
    return "#C55A3A";
  }
  function ragBar(s: number) {
    if (s >= 70) return "var(--ink)";
    if (s >= 55) return "#E2C94A";
    return "#E97451";
  }

  return (
    <section
      ref={ref}
      style={{
        borderTop: "1px solid var(--border)",
        background: "linear-gradient(180deg, var(--bg) 0%, var(--bg-off) 100%)",
        padding: shown ? "72px 40px 96px" : "0",
        maxHeight: shown ? "none" : "0",
        overflow: shown ? "visible" : "hidden",
        transition: "padding 360ms cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      {shown && resolved && (
        <div style={{
          maxWidth: 1080, margin: "0 auto",
          animation: "aiq-fade-up 600ms cubic-bezier(0.16,1,0.3,1) both",
        }}>
          {/* Eyebrow */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 28,
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              fontFamily: "var(--mono)", fontSize: 10,
              color: "var(--text-3)", letterSpacing: "0.14em", textTransform: "uppercase",
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: isReal ? "var(--ink)" : "#B59A2A",
              }} />
              {isReal ? "Snapshot" : "Preview"} · {resolved.display.toLowerCase()} · scored for {intent.verb}
            </div>
            <div style={{
              fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-4)",
              letterSpacing: "0.1em", textTransform: "uppercase",
            }}>
              {isReal
                ? `engine run · live · ${realLoc?.lsoa ?? "LSOA"}`
                : "demo numbers · sign up for live"}
            </div>
          </div>

          {/* Serif headline */}
          <h2 style={{
            fontFamily: "var(--display)", fontWeight: 400, fontStyle: "normal",
            fontSize: "clamp(2.2rem, 3.8vw, 3.2rem)", lineHeight: 1.08,
            letterSpacing: "-0.025em", color: "var(--ink-deep)",
            maxWidth: "24ch", margin: "0 0 36px",
          }}>
            {resolved.display} scores{" "}
            <span style={{ color: "var(--ink)", fontStyle: "italic" }}>{score}</span>{" "}
            for <span style={{ color: "var(--ink)", fontStyle: "italic" }}>{intent.verb}</span>.
          </h2>

          {/* Score + Narrative grid */}
          <div className="aiq-report-grid" style={{
            display: "grid",
            gridTemplateColumns: "260px minmax(0, 1fr)",
            gap: 48, alignItems: "start",
            border: "1px solid var(--border)",
            borderRadius: 20,
            background: "var(--bg)",
            padding: 36,
            boxShadow: "0 1px 0 rgba(6,42,30,0.02), 0 16px 48px rgba(6,42,30,0.06)",
            marginBottom: 32,
          }}>
            {/* Score ring */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <ScoreRing score={score} intentId={intentId} />
              <div style={{
                marginTop: 18, textAlign: "center",
              }}>
                <div style={{
                  fontFamily: "var(--display)", fontStyle: "italic",
                  fontSize: 18, color: "var(--ink)", letterSpacing: "-0.015em",
                }}>
                  {label}
                </div>
                <div style={{
                  fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-4)",
                  letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 4,
                }}>
                  out of 100 · intent {intentId}
                </div>
              </div>
            </div>

            {/* Narrative column */}
            <div>
              <div style={{
                fontFamily: "var(--mono)", fontSize: 10,
                color: "var(--ink)", letterSpacing: "0.14em", textTransform: "uppercase",
                marginBottom: 14,
              }}>
                Narrative · areaiq engine
              </div>
              <p
                key={`nar-${intentId}-${resolved.display}`}
                style={{
                  fontFamily: "var(--sans)", fontSize: 17, lineHeight: 1.7,
                  color: "var(--text-2)", letterSpacing: "-0.005em",
                  margin: "0 0 24px",
                  animation: "aiq-fade-up 500ms cubic-bezier(0.16,1,0.3,1) both",
                }}
              >
                {narrative}
              </p>

              {/* Locked / CTA block · the teaser reveal */}
              <div style={{
                border: "1px solid var(--ink-deep)",
                background: "var(--bg-ink)",
                borderRadius: 14, padding: "22px 24px",
                position: "relative", overflow: "hidden",
              }}>
                {/* subtle chartreuse rule */}
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 3,
                  background: "var(--signal)",
                }} />

                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  marginBottom: 14,
                }}>
                  <span style={{
                    fontFamily: "var(--mono)", fontSize: 10,
                    color: "var(--signal)", letterSpacing: "0.18em",
                    textTransform: "uppercase", fontWeight: 500,
                  }}>
                    Next in the full report
                  </span>
                  <span style={{
                    fontFamily: "var(--mono)", fontSize: 9,
                    color: "rgba(246,249,244,0.38)",
                    letterSpacing: "0.1em",
                  }}>
                    locked
                  </span>
                </div>

                <ul style={{
                  listStyle: "none", padding: 0, margin: "0 0 20px",
                  display: "grid", gap: 8,
                }}>
                  {[
                    `${hiddenCount} more dimension${hiddenCount === 1 ? "" : "s"} scored against 7 datasets`,
                    "Tailored recommendations for your situation",
                    "5-year trend data and comparable postcodes",
                    "Downloadable PDF + shareable permalink",
                  ].map((bullet) => (
                    <li key={bullet} style={{
                      display: "grid", gridTemplateColumns: "16px 1fr", gap: 10,
                      alignItems: "baseline",
                      fontFamily: "var(--sans)", fontSize: 14,
                      color: "rgba(246,249,244,0.82)", letterSpacing: "-0.005em",
                      lineHeight: 1.45,
                    }}>
                      <span style={{
                        color: "var(--signal)", fontFamily: "var(--mono)",
                        fontSize: 12, transform: "translateY(-0.1em)",
                      }}>↳</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href="/design-v2/sign-up"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    fontFamily: "var(--sans)", fontSize: 14, fontWeight: 600,
                    color: "var(--signal-ink)", background: "var(--signal)",
                    border: "1px solid var(--ink-deep)",
                    borderRadius: 999, padding: "11px 20px",
                    textDecoration: "none", letterSpacing: "-0.005em",
                    transition: "transform 140ms cubic-bezier(0.16,1,0.3,1), box-shadow 140ms",
                    boxShadow: "0 1px 0 rgba(6,42,30,0.04)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 10px 24px rgba(212,243,58,0.30)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 1px 0 rgba(6,42,30,0.04)";
                  }}
                >
                  Get the full report →
                </a>
                <span style={{
                  marginLeft: 14,
                  fontFamily: "var(--mono)", fontSize: 10,
                  color: "rgba(246,249,244,0.48)",
                  letterSpacing: "0.06em",
                }}>
                  3 free / month · no card
                </span>
              </div>
            </div>
          </div>

          {/* Dimensions · snapshot: top 3 by weight only */}
          <div style={{
            border: "1px solid var(--border)",
            borderRadius: 16, background: "var(--bg)",
            padding: "20px 28px 16px",
            marginBottom: 24,
          }}>
            <div style={{
              display: "flex", alignItems: "baseline", justifyContent: "space-between",
              marginBottom: 14,
            }}>
              <div style={{
                fontFamily: "var(--mono)", fontSize: 10,
                color: "var(--ink)", letterSpacing: "0.14em", textTransform: "uppercase",
              }}>
                Top 3 dimensions · weighted for {intent.verb}
              </div>
              <div style={{
                fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-4)",
                letterSpacing: "0.08em",
              }}>
                +{hiddenCount} more in full report
              </div>
            </div>

            {topDims.map((d, i) => (
              <div key={d.key} className="aiq-dim-row" style={{
                display: "grid",
                gridTemplateColumns: "minmax(180px, 240px) minmax(0, 1fr) 48px",
                alignItems: "center", gap: 20,
                padding: "14px 0",
                borderBottom: i < topDims.length - 1 ? "1px solid var(--border-dim)" : "none",
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 500, color: "var(--ink-deep)",
                    letterSpacing: "-0.005em",
                  }}>{d.label}</div>
                  <div
                    key={`w-${d.key}-${intentId}`}
                    style={{
                      fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-3)",
                      marginTop: 3, letterSpacing: "0.04em",
                      animation: "aiq-fade-up 360ms cubic-bezier(0.16,1,0.3,1) both",
                    }}
                  >
                    <span style={{
                      color: "var(--ink)", fontWeight: 600,
                    }}>{d.weight}% weight</span>
                    {" "}for {intent.verb}
                  </div>
                </div>

                <div style={{ minWidth: 0, overflow: "hidden" }}>
                  <div style={{
                    height: 6, background: "var(--border-dim)",
                    borderRadius: 3, overflow: "hidden", position: "relative",
                  }}>
                    <div style={{
                      height: "100%", width: `${d.score}%`,
                      background: ragBar(d.score), borderRadius: 3,
                      transition: "width 600ms cubic-bezier(0.16,1,0.3,1)",
                    }} />
                  </div>
                  <div style={{
                    fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-4)",
                    marginTop: 5, letterSpacing: "0.01em",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    maxWidth: "100%",
                  }}>{d.detail}</div>
                </div>

                <div style={{
                  fontFamily: "var(--display)", fontSize: 24, fontWeight: 400,
                  color: rag(d.score), textAlign: "right", letterSpacing: "-0.02em",
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {d.score}
                </div>
              </div>
            ))}

            {/* Locked rows hint */}
            <div style={{
              marginTop: 12, padding: "14px 0 4px",
              borderTop: "1px dashed var(--border)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              fontFamily: "var(--mono)", fontSize: 10,
              color: "var(--text-4)", letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}>
              <span>+ {hiddenCount} more dimensions locked</span>
              <a href="/design-v2/sign-up" style={{
                color: "var(--ink)", textDecoration: "none",
                borderBottom: "1px solid var(--signal)", paddingBottom: 1,
              }}>unlock →</a>
            </div>
          </div>

          {/* Footer row */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "14px 24px",
            border: "1px solid var(--border)",
            borderRadius: 12, background: "var(--bg)",
          }}>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
              {SOURCES.map((s) => (
                <span key={s.key} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-3)",
                  letterSpacing: "0.04em",
                }}>
                  <span style={{
                    width: 5, height: 5, borderRadius: "50%",
                    background: "var(--ink)",
                  }} />
                  {s.name}
                </span>
              ))}
            </div>
            <div style={{
              fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-4)",
              letterSpacing: "0.04em",
            }}>
              LSOA-level · 2.6s total
            </div>
          </div>
        </div>
      )}
    </section>
  );
});
SampleReport.displayName = "SampleReport";

/* ─────── Score ring (animated) ─────── */

function ScoreRing({ score, intentId }: { score: number; intentId: IntentId }) {
  const [drawn, setDrawn] = useState(0);
  const [display, setDisplay] = useState(0);

  // Animate both the ring sweep and the number tween on intent change.
  useEffect(() => {
    const from = drawn;
    const to = score;
    const dur = 700;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = Math.round(from + (to - from) * eased);
      setDrawn(v);
      setDisplay(v);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, intentId]);

  const R = 62;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - drawn / 100);

  return (
    <div style={{ position: "relative", width: 160, height: 160 }}>
      <svg width="160" height="160" viewBox="0 0 160 160">
        <defs>
          <linearGradient id="score-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--ink)" />
            <stop offset="100%" stopColor="var(--signal)" />
          </linearGradient>
        </defs>
        <circle cx="80" cy="80" r={R} fill="none" stroke="var(--border-dim)" strokeWidth="6" />
        <circle
          cx="80" cy="80" r={R}
          fill="none"
          stroke="url(#score-grad)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={offset}
          transform="rotate(-90 80 80)"
        />
        {/* Inner tick marks */}
        {[0, 25, 50, 75].map((p) => {
          const a = (p / 100) * 2 * Math.PI - Math.PI / 2;
          const x1 = 80 + Math.cos(a) * (R - 10);
          const y1 = 80 + Math.sin(a) * (R - 10);
          const x2 = 80 + Math.cos(a) * (R - 4);
          const y2 = 80 + Math.sin(a) * (R - 4);
          return <line key={p} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--border)" strokeWidth="1" />;
        })}
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          fontFamily: "var(--display)", fontWeight: 400,
          fontSize: 54, lineHeight: 1, color: "var(--ink-deep)",
          letterSpacing: "-0.04em",
          fontVariantNumeric: "tabular-nums",
        }}>
          {display}
        </div>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 9, color: "var(--text-4)",
          letterSpacing: "0.14em", textTransform: "uppercase", marginTop: 4,
        }}>
          score
        </div>
      </div>
    </div>
  );
}

/* ─────── HeroReportCard · illustrative sample output in the hero ─────── */
/* This is what the user gets when they run the engine. Static by design:
   it's a preview, not a live report. Real live report lives downstream. */

const HERO_CARD_DIMS = [
  { label: "Safety & Crime",      score: 80, weight: 25 },
  { label: "Schools & Education", score: 95, weight: 20 },
  { label: "Transport & Commute", score: 95, weight: 20 },
  { label: "Daily Amenities",     score: 95, weight: 15 },
  { label: "Cost of Living",      score: 58, weight: 20 },
];

function HeroReportCard({
  intent, resolved,
}: {
  intent: (typeof INTENTS)[number];
  resolved: { lat: number; lng: number; display: string } | null;
}) {
  const displayName = resolved?.display || "Manchester";
  return (
    <aside style={{
      position: "relative",
      animation: "aiq-fade-up 900ms cubic-bezier(0.16,1,0.3,1) 200ms both",
    }}>
      {/* Paper underlay · gives it a printed-report feel */}
      <div style={{
        position: "absolute", inset: 0,
        transform: "translate(10px, 12px) rotate(0.6deg)",
        background: "var(--bg-off)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        zIndex: 0,
      }} />
      <div style={{
        position: "absolute", inset: 0,
        transform: "translate(5px, 6px) rotate(0.2deg)",
        background: "var(--bg)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        zIndex: 1,
      }} />

      <article style={{
        position: "relative", zIndex: 2,
        background: "var(--bg)",
        border: "1px solid var(--ink-deep)",
        borderRadius: 6,
        padding: "26px 30px 24px",
        boxShadow: "0 18px 40px rgba(6,42,30,0.08), 0 2px 6px rgba(6,42,30,0.04)",
      }}>
        {/* Header strip */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          gap: 10, flexWrap: "wrap",
          paddingBottom: 14,
          borderBottom: "1px solid var(--border)",
        }}>
          <div style={{
            fontFamily: "var(--mono)", fontSize: 10,
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: "var(--ink)",
            display: "inline-flex", alignItems: "center", gap: 8,
          }}>
            <Mark size={14} />
            OneGoodArea report
          </div>
          <div style={{
            fontFamily: "var(--mono)", fontSize: 9,
            letterSpacing: "0.18em", textTransform: "uppercase",
            color: "var(--text-3)",
          }}>preview · sample</div>
        </div>

        {/* Area + intent */}
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10,
          letterSpacing: "0.18em", textTransform: "uppercase",
          color: "var(--text-3)",
          margin: "18px 0 8px",
        }}>
          {displayName} · scored for <span style={{ color: "var(--ink)", fontWeight: 500 }}>{intent.verb}</span>
        </div>

        {/* Verdict + score */}
        <div style={{
          display: "flex", alignItems: "flex-end", justifyContent: "space-between",
          gap: 16, margin: "0 0 22px",
        }}>
          <h3 style={{
            fontFamily: "var(--display)", fontWeight: 400,
            fontStyle: "italic",
            fontSize: "clamp(1.8rem, 3vw, 2.3rem)", lineHeight: 1.05,
            letterSpacing: "-0.02em", color: "var(--ink-deep)", margin: 0,
          }}>
            Strong fit<span style={{ borderBottom: "3px solid var(--signal)", paddingBottom: 2 }}>.</span>
          </h3>
          <div style={{
            fontFamily: "var(--display)", fontWeight: 400,
            fontSize: "clamp(2.6rem, 4vw, 3.4rem)", lineHeight: 1,
            color: "var(--ink-deep)", letterSpacing: "-0.03em",
            fontVariantNumeric: "tabular-nums",
          }}>
            84<span style={{
              fontSize: "0.38em", color: "var(--text-3)",
              fontFamily: "var(--mono)", marginLeft: 4,
            }}>/ 100</span>
          </div>
        </div>

        {/* Dimension bars */}
        <div style={{
          borderTop: "1px dashed var(--border)",
          paddingTop: 14, marginBottom: 18,
        }}>
          {HERO_CARD_DIMS.map((d, i) => (
            <HeroCardDim key={d.label} dim={d} index={i} />
          ))}
        </div>

        {/* Narrative preview */}
        <div style={{
          fontFamily: "var(--display)", fontStyle: "italic", fontWeight: 400,
          fontSize: 15.5, lineHeight: 1.55,
          color: "var(--ink-deep)", letterSpacing: "-0.005em",
          position: "relative", paddingLeft: 22,
          margin: "0 0 18px",
        }}>
          <span style={{
            position: "absolute", left: 0, top: -6,
            fontSize: 38, color: "var(--signal)",
            fontFamily: "var(--display)", lineHeight: 1,
          }}>&ldquo;</span>
          Manchester does what a move needs: exceptional transport, abundant
          amenities, and safety that reads strong for a city core.
        </div>

        {/* Footer · trust strip */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          gap: 12, flexWrap: "wrap",
          paddingTop: 14, borderTop: "1px solid var(--border)",
          fontFamily: "var(--mono)", fontSize: 9,
          letterSpacing: "0.18em", textTransform: "uppercase",
          color: "var(--text-3)",
        }}>
          <span>7 public datasets · LSOA precision</span>
          <span style={{ color: "var(--ink)" }}>numbers locked</span>
        </div>
      </article>

      {/* Small caption under the card */}
      <div style={{
        fontFamily: "var(--mono)", fontSize: 10,
        letterSpacing: "0.16em", textTransform: "uppercase",
        color: "var(--text-3)", textAlign: "center",
        marginTop: 22,
      }}>
        sample · type a real postcode to generate yours
      </div>
    </aside>
  );
}

function HeroCardDim({
  dim, index,
}: {
  dim: (typeof HERO_CARD_DIMS)[number];
  index: number;
}) {
  const rag = dim.score >= 70 ? "var(--ink)" : dim.score >= 45 ? "#E2C94A" : "#E97451";
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "minmax(0, 1fr) 80px 36px 42px",
      gap: 12, alignItems: "center",
      padding: "6px 0",
    }}>
      <div style={{
        fontFamily: "var(--sans)", fontSize: 13, fontWeight: 500,
        color: "var(--ink-deep)", letterSpacing: "-0.005em",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>{dim.label}</div>
      <div style={{
        position: "relative", height: 4,
        background: "var(--border-dim)", borderRadius: 999, overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          width: `${dim.score}%`,
          background: rag,
          borderRadius: 999,
          animation: `aiq-fade-up 700ms cubic-bezier(0.16,1,0.3,1) ${600 + index * 80}ms both`,
        }} />
      </div>
      <div style={{
        fontFamily: "var(--display)", fontSize: 17, color: "var(--ink-deep)",
        fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em",
        textAlign: "right",
      }}>{dim.score}</div>
      <div style={{
        fontFamily: "var(--mono)", fontSize: 9,
        color: "var(--ink-deep)", fontWeight: 600,
        background: "var(--signal-dim)",
        padding: "2px 4px", borderRadius: 2,
        textAlign: "center", letterSpacing: "0.02em",
      }}>{dim.weight}%</div>
    </div>
  );
}

/* ─────── How It Works · interactive step player ─────── */

type HIWStepId = "input" | "intent" | "datasets" | "report";

const HIW_STEPS: {
  id: HIWStepId;
  number: string;
  short: string;
  title: string;
  blurb: string;
}[] = [
  {
    id: "input",
    number: "01",
    short: "Locate",
    title: "Type a place.",
    blurb: "A UK postcode, a city, or a town. Autocomplete pins the exact neighbourhood before anything else runs.",
  },
  {
    id: "intent",
    number: "02",
    short: "Intent",
    title: "Pick why you're looking.",
    blurb: "Moving home, opening a business, property investing, or market research. Each reads the same area through a different lens.",
  },
  {
    id: "datasets",
    number: "03",
    short: "Evidence",
    title: "We gather the evidence.",
    blurb: "Crime, schools, transport, amenities, deprivation, property prices, flood risk. All public, all at once.",
  },
  {
    id: "report",
    number: "04",
    short: "Report",
    title: "Out comes a report.",
    blurb: "A score, five weighted dimensions with plain-English reasoning, a narrative read, and specific recommendations.",
  },
];

function HowItWorks() {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", handleEsc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = prev;
    };
  }, [expanded]);

  return (
    <>
      <section id="how-it-works" style={{
        background: "var(--bg-off)",
        borderTop: "1px solid var(--border)",
        padding: "96px 0 112px",
      }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 40px" }}>
          <div style={{ textAlign: "center", maxWidth: 680, margin: "0 auto 64px" }}>
            <div style={{
              fontFamily: "var(--mono)", fontSize: 11,
              letterSpacing: "0.22em", textTransform: "uppercase",
              color: "var(--text-3)", marginBottom: 18,
            }}>How it works</div>
            <h2 style={{
              fontFamily: "var(--display)", fontWeight: 400,
              fontSize: "clamp(1.9rem, 3.6vw, 2.8rem)",
              lineHeight: 1.08, letterSpacing: "-0.02em",
              color: "var(--ink-deep)", margin: 0,
            }}>
              A postcode to a{" "}
              <span style={{
                fontStyle: "italic", color: "var(--ink)",
                borderBottom: "3px solid var(--signal)", paddingBottom: 2,
              }}>full read</span>, in four steps.
            </h2>
          </div>
          <div>
            {HIW_STEPS.map((step, i) => (
              <HIWRow
                key={step.id}
                step={step}
                index={i}
                last={i === HIW_STEPS.length - 1}
                onExpandReport={() => setExpanded(true)}
              />
            ))}
          </div>
        </div>
      </section>

      {expanded && <ExpandedReportModal onClose={() => setExpanded(false)} />}
    </>
  );
}

function HIWRow({
  step, index, last, onExpandReport,
}: {
  step: (typeof HIW_STEPS)[number];
  index: number;
  last: boolean;
  onExpandReport: () => void;
}) {
  const reverse = index % 2 === 1;
  const copy = (
    <div>
      <div style={{
        fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
        letterSpacing: "0.22em", color: "var(--ink)",
        marginBottom: 14, textTransform: "uppercase",
      }}>Step {step.number}</div>
      <h3 style={{
        fontFamily: "var(--display)", fontWeight: 400,
        fontSize: "clamp(1.55rem, 2.4vw, 2rem)", lineHeight: 1.12,
        letterSpacing: "-0.02em", color: "var(--ink-deep)", margin: 0,
      }}>
        {step.title}
      </h3>
      <p style={{
        fontFamily: "var(--sans)", fontSize: 15.5, lineHeight: 1.6,
        color: "var(--text-2)", letterSpacing: "-0.003em",
        margin: "16px 0 0", maxWidth: "36ch",
      }}>
        {step.blurb}
      </p>
    </div>
  );
  const ui = (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 14,
    }}>
      {step.id === "input" && <HIWPanelInput />}
      {step.id === "intent" && <HIWPanelIntent />}
      {step.id === "datasets" && <HIWPanelDatasets />}
      {step.id === "report" && <HIWPanelReport onExpand={onExpandReport} />}
    </div>
  );

  return (
    <>
      <div className="aiq-hiw-row" style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 64,
        alignItems: "center",
        padding: "36px 0",
      }}>
        {reverse ? (<>{ui}{copy}</>) : (<>{copy}{ui}</>)}
      </div>
      {!last && <HIWConnector />}
    </>
  );
}

function HIWConnector() {
  return (
    <div className="aiq-hiw-connector" style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      padding: "8px 0",
    }}>
      <div style={{
        width: 1, height: 48, background: "var(--border)",
        position: "relative",
      }}>
        <span style={{
          position: "absolute", left: "50%", top: "50%",
          transform: "translate(-50%, -50%)",
          width: 9, height: 9, borderRadius: 999,
          background: "var(--signal)",
          boxShadow: "0 0 0 4px var(--bg-off)",
        }} />
      </div>
    </div>
  );
}

function HIWPanelInput() {
  return (
    <div style={{ width: "100%", maxWidth: 420 }}>
      <div style={{
        position: "relative",
        border: "1.5px solid var(--ink)",
        borderRadius: 10,
        background: "var(--bg)",
        padding: "18px 20px",
        fontFamily: "var(--sans)", fontSize: 17, fontWeight: 500,
        color: "var(--ink-deep)",
        boxShadow: "0 4px 14px rgba(6,42,30,0.06)",
      }}>
        Manchester
        <span style={{
          width: 2, height: 18, background: "var(--signal)",
          marginLeft: 3, display: "inline-block", verticalAlign: "text-bottom",
          animation: "aiq-caret 1000ms steps(2) infinite",
        }} />
        <div style={{
          position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)",
          display: "inline-flex", alignItems: "center", gap: 6,
          fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
          color: "var(--ink)", letterSpacing: "0.14em", textTransform: "uppercase",
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6.2l2.3 2.3 4.8-4.8" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          found
        </div>
      </div>
      <div style={{
        marginTop: 14,
        display: "flex", alignItems: "center", gap: 10,
        fontFamily: "var(--mono)", fontSize: 10,
        letterSpacing: "0.18em", textTransform: "uppercase",
        color: "var(--text-3)",
      }}>
        <span style={{ width: 14, height: 1, background: "var(--ink)", display: "inline-block" }} />
        North West · urban · neighbourhood pinned
      </div>
    </div>
  );
}

const HIW_INTENT_ITEMS = [
  { id: "moving",     number: "01", verb: "moving home" },
  { id: "business",   number: "02", verb: "opening a business" },
  { id: "investing",  number: "03", verb: "property investing" },
  { id: "research",   number: "04", verb: "market research" },
];

function HIWPanelIntent() {
  return (
    <div style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: 10 }}>
      {HIW_INTENT_ITEMS.map((it) => {
        const active = it.id === "moving";
        return (
          <div key={it.id} style={{
            border: `1px solid ${active ? "var(--ink-deep)" : "var(--border)"}`,
            background: active ? "var(--bg-ink)" : "var(--bg)",
            borderRadius: 999,
            padding: "10px 18px",
            display: "flex", alignItems: "center", gap: 12,
            transition: "all 200ms",
          }}>
            <span style={{
              fontFamily: "var(--mono)", fontSize: 10,
              color: active ? "rgba(212,243,58,0.55)" : "var(--text-3)",
              letterSpacing: "0.18em",
            }}>{it.number}</span>
            <span style={{
              fontFamily: "var(--display)", fontStyle: "italic",
              fontSize: 16, fontWeight: 400,
              color: active ? "var(--signal)" : "var(--text-2)",
              letterSpacing: "-0.01em",
            }}>{it.verb}</span>
            {active && (
              <span style={{
                marginLeft: "auto",
                fontFamily: "var(--mono)", fontSize: 9,
                color: "rgba(212,243,58,0.7)",
                letterSpacing: "0.2em", textTransform: "uppercase",
              }}>active</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function HIWPanelDatasets() {
  const [running, setRunning] = useState(false);
  useEffect(() => {
    setRunning(false);
    const t = setTimeout(() => setRunning(true), 120);
    return () => clearTimeout(t);
  }, []);
  const sources = [
    { name: "Crime",       latency: 380 },
    { name: "Deprivation", latency: 90  },
    { name: "Amenities",   latency: 620 },
    { name: "Flood risk",  latency: 210 },
    { name: "Property",    latency: 450 },
    { name: "Schools",     latency: 180 },
  ];
  const max = 620;
  return (
    <div style={{ width: "100%", maxWidth: 440 }}>
      {sources.map((s, i) => {
        const w = (s.latency / max) * 100;
        const delay = 60 + i * 40;
        return (
          <div key={s.name} style={{
            display: "grid",
            gridTemplateColumns: "100px 1fr 20px",
            gap: 14, alignItems: "center",
            padding: "9px 0",
            borderBottom: i < sources.length - 1 ? "1px solid var(--border-dim)" : "none",
          }}>
            <div style={{
              fontFamily: "var(--sans)", fontSize: 13, fontWeight: 500,
              color: "var(--ink-deep)", letterSpacing: "-0.005em",
            }}>{s.name}</div>
            <div style={{
              position: "relative", height: 4,
              background: "var(--border-dim)", borderRadius: 999, overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", inset: 0,
                width: running ? `${w}%` : "0%",
                background: "var(--ink)",
                transition: `width 900ms cubic-bezier(0.22,0.61,0.36,1) ${delay}ms`,
                borderRadius: 999,
              }} />
            </div>
            <div style={{
              fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600,
              color: "var(--ink)",
              opacity: running ? 1 : 0,
              transition: `opacity 200ms ${delay + 900}ms`,
              textAlign: "right",
            }}>✓</div>
          </div>
        );
      })}
    </div>
  );
}

function HIWPanelReport({ onExpand }: { onExpand?: () => void }) {
  const dims: { label: string; score: number }[] = [
    { label: "Safety & Crime",      score: 80 },
    { label: "Schools & Education", score: 95 },
    { label: "Transport & Commute", score: 95 },
    { label: "Daily Amenities",     score: 95 },
    { label: "Cost of Living",      score: 58 },
  ];
  return (
    <div style={{
      width: "100%", maxWidth: 420,
      background: "var(--bg)",
      border: "1px solid var(--ink-deep)",
      borderRadius: 6,
      padding: "22px 24px",
      boxShadow: "0 14px 34px rgba(6,42,30,0.08), 0 2px 6px rgba(6,42,30,0.04)",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "baseline",
        paddingBottom: 12,
        borderBottom: "1px solid var(--border)",
      }}>
        <span style={{
          fontFamily: "var(--mono)", fontSize: 9,
          letterSpacing: "0.2em", textTransform: "uppercase",
          color: "var(--text-3)",
        }}>Manchester · moving home</span>
        <span style={{
          fontFamily: "var(--display)", fontSize: 28, lineHeight: 1,
          color: "var(--ink-deep)", fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.03em", fontWeight: 400,
        }}>
          84<span style={{
            fontSize: 11, color: "var(--text-3)",
            fontFamily: "var(--mono)", marginLeft: 3,
          }}>/100</span>
        </span>
      </div>
      <h4 style={{
        fontFamily: "var(--display)", fontStyle: "italic", fontWeight: 400,
        fontSize: 20, lineHeight: 1.15, letterSpacing: "-0.015em",
        color: "var(--ink-deep)",
        margin: "16px 0 14px",
      }}>
        Strong fit<span style={{ borderBottom: "2px solid var(--signal)", paddingBottom: 1 }}>.</span>
      </h4>
      {dims.map((d) => {
        const rag = d.score >= 70 ? "var(--ink)" : d.score >= 45 ? "#E2C94A" : "#E97451";
        return (
          <div key={d.label} style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 70px 26px",
            gap: 10, alignItems: "center",
            padding: "5px 0",
          }}>
            <div style={{
              fontFamily: "var(--sans)", fontSize: 12, fontWeight: 500,
              color: "var(--ink-deep)", letterSpacing: "-0.005em",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{d.label}</div>
            <div style={{
              height: 3, background: "var(--border-dim)",
              borderRadius: 999, overflow: "hidden",
            }}>
              <div style={{ width: `${d.score}%`, height: "100%", background: rag, borderRadius: 999 }} />
            </div>
            <div style={{
              fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
              color: "var(--ink-deep)", textAlign: "right",
              fontVariantNumeric: "tabular-nums",
            }}>{d.score}</div>
          </div>
        );
      })}
      {onExpand && (
        <button
          onClick={onExpand}
          style={{
            marginTop: 14, paddingTop: 12,
            borderTop: "1px dashed var(--border)",
            width: "100%", background: "transparent", border: "none",
            cursor: "pointer", textAlign: "left",
            fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
            letterSpacing: "0.18em", textTransform: "uppercase",
            color: "var(--ink)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 8,
            transition: "color 160ms",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ink-deep)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink)")}
        >
          <span>See the full report</span>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            color: "var(--ink-deep)",
          }}>
            expand
            <span style={{
              width: 20, height: 20, borderRadius: 2,
              background: "var(--signal)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              color: "var(--ink-deep)", fontSize: 11,
            }}>↗</span>
          </span>
        </button>
      )}
    </div>
  );
}

/* ─────── Expanded Report Modal · full anatomy behind Step 4 expand ─────── */

function ExpandedReportModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed", inset: 0,
        background: "rgba(6,42,30,0.62)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        zIndex: 100,
        overflow: "auto",
        padding: "40px 20px",
        animation: "aiq-fade-up 260ms cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          maxWidth: 860, margin: "0 auto",
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute", top: -40, right: 0,
            background: "transparent", border: "none", cursor: "pointer",
            fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: "var(--signal)",
            display: "inline-flex", alignItems: "center", gap: 10,
          }}
        >
          close
          <span style={{
            width: 22, height: 22, borderRadius: 2,
            border: "1px solid var(--signal)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontSize: 13,
          }}>×</span>
        </button>

        <article style={{
          background: "var(--bg)",
          border: "1px solid var(--ink-deep)",
          borderRadius: 6,
          boxShadow: "0 40px 80px rgba(6,42,30,0.35), 0 6px 14px rgba(6,42,30,0.12)",
          overflow: "hidden",
        }}>
          <IRHeader />
          <IRSummary />
          <IRScoreBlock />
          <IRPropertyMarket />
          <IRNarrativeBlock />
          <IRSchools />
          <IRRecommendations />
          <IRFooter />
        </article>
      </div>
    </div>
  );
}

/* ─────── Intents section · pure explanation of the four lenses ─────── */

const INTENTS_DATA: {
  id: string;
  number: string;
  verb: string;
  lede: string;
  dims: string[];
}[] = [
  {
    id: "moving",
    number: "01",
    verb: "moving home",
    lede: "What a buyer or renter needs to know about a neighbourhood before they commit to a viewing or a tenancy.",
    dims: [
      "Safety & Crime",
      "Schools & Education",
      "Transport & Commute",
      "Daily Amenities",
      "Cost of Living",
    ],
  },
  {
    id: "business",
    number: "02",
    verb: "opening a business",
    lede: "What an operator needs before they sign a lease: footfall, competition, and the cost of holding the space.",
    dims: [
      "Foot Traffic & Demand",
      "Competition Density",
      "Transport & Access",
      "Local Spending Power",
      "Commercial Costs",
    ],
  },
  {
    id: "investing",
    number: "03",
    verb: "property investing",
    lede: "What a capital allocator weighs when sizing up a buy-to-let or a development opportunity.",
    dims: [
      "Price Growth",
      "Rental Yield",
      "Regeneration",
      "Tenant Demand",
      "Risk Factors",
    ],
  },
  {
    id: "research",
    number: "04",
    verb: "market research",
    lede: "The balanced, neutral read for analysts, agents, and journalists writing about an area.",
    dims: [
      "Safety & Crime",
      "Transport Links",
      "Amenities & Services",
      "Demographics",
      "Environment & Quality",
    ],
  },
];

function IntentsSection() {
  return (
    <section id="intents" style={{
      background: "var(--bg)",
      borderTop: "1px solid var(--border)",
      padding: "104px 0 120px",
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto 56px" }}>
          <div style={{
            fontFamily: "var(--mono)", fontSize: 11,
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: "var(--text-3)", marginBottom: 18,
          }}>The intents</div>
          <h2 style={{
            fontFamily: "var(--display)", fontWeight: 400,
            fontSize: "clamp(1.9rem, 3.6vw, 2.8rem)",
            lineHeight: 1.08, letterSpacing: "-0.02em",
            color: "var(--ink-deep)", margin: 0,
          }}>
            Four readings for{" "}
            <span style={{
              fontStyle: "italic", color: "var(--ink)",
              borderBottom: "3px solid var(--signal)", paddingBottom: 2,
            }}>four situations</span>.
          </h2>
          <p style={{
            fontFamily: "var(--sans)", fontSize: 16.5, lineHeight: 1.55,
            color: "var(--text-2)", letterSpacing: "-0.003em",
            margin: "20px auto 0", maxWidth: "54ch",
          }}>
            Each intent replaces the dimensions and reweights the data. Pick the lens
            that matches what you're doing. The engine does the rest.
          </p>
        </div>

        <div className="aiq-intents-grid" style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          border: "1px solid var(--border)",
          borderRadius: 4,
          overflow: "hidden",
          background: "var(--bg)",
        }}>
          {INTENTS_DATA.map((it, i) => (
            <IntentColumn
              key={it.id}
              intent={it}
              last={i === INTENTS_DATA.length - 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function IntentColumn({
  intent, last,
}: {
  intent: (typeof INTENTS_DATA)[number];
  last: boolean;
}) {
  return (
    <div className="aiq-intent-col" style={{
      padding: "30px 24px 34px",
      borderRight: last ? "none" : "1px solid var(--border)",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{
        fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
        letterSpacing: "0.22em", color: "var(--ink)",
      }}>{intent.number}</div>

      <h3 style={{
        fontFamily: "var(--display)", fontStyle: "italic", fontWeight: 400,
        fontSize: 23, lineHeight: 1.15, letterSpacing: "-0.015em",
        color: "var(--ink-deep)", margin: "8px 0 18px",
      }}>
        {intent.verb}
      </h3>

      <p style={{
        fontFamily: "var(--sans)", fontSize: 14, lineHeight: 1.55,
        color: "var(--text-2)", letterSpacing: "-0.003em",
        margin: "0 0 24px", minHeight: 88,
      }}>
        {intent.lede}
      </p>

      <div style={{
        paddingTop: 18,
        borderTop: "1px dashed var(--border)",
      }}>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 9, fontWeight: 500,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: "var(--text-3)", marginBottom: 12,
        }}>Scored on</div>
        <ul style={{
          listStyle: "none", padding: 0, margin: 0,
          display: "flex", flexDirection: "column", gap: 7,
        }}>
          {intent.dims.map((d) => (
            <li key={d} style={{
              fontFamily: "var(--sans)", fontSize: 13.5, fontWeight: 500,
              color: "var(--ink-deep)", letterSpacing: "-0.003em",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{
                width: 4, height: 4, borderRadius: 999,
                background: "var(--signal)", flexShrink: 0,
              }} />
              {d}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ─────── Who uses it & why ─────── */

const WHO_ITEMS: { icon: IconName; title: string; body: string }[] = [
  { icon: "buyer",    title: "Home Buyers",       body: "Evaluate safety, school catchments, and commute times before choosing where to live." },
  { icon: "investor", title: "Property Investors", body: "Compare rental yields, price growth, and regeneration potential across areas." },
  { icon: "agent",    title: "Estate Agents",     body: "Create data-backed area briefings for client viewings and property listings." },
  { icon: "operator", title: "Business Owners",   body: "Assess foot traffic, competition, and local spending power before opening." },
];

const WHY_ITEMS: { icon: IconName; title: string; body: string }[] = [
  { icon: "intent", title: "Intent-driven scoring",   body: "Same area, different scores for moving, investing, or opening a business. Most tools give you one generic view." },
  { icon: "data",   title: "Transparent methodology", body: "Scores computed from real public data using transparent formulas. Same postcode, same score, every time." },
  { icon: "read",   title: "AI that reads the data",  body: "Numbers tell you what. Our engine explains why: plain English, tailored to your situation, with specific recommendations." },
  { icon: "api",    title: "Developer API",           body: "A REST API with Bearer auth. Embed area intelligence into property platforms, CRM tools, and relocation apps." },
];

function AudiencesSection() {
  return (
    <section id="who-uses-it" style={{
      background: "var(--bg-off)",
      borderTop: "1px solid var(--border)",
      padding: "104px 0 120px",
    }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{
            fontFamily: "var(--mono)", fontSize: 11,
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: "var(--text-3)",
          }}>Who uses it · why use it</div>
        </div>

        <div className="aiq-who-why-grid" style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 0,
          position: "relative",
        }}>
          <div className="aiq-who-why-divider" style={{
            position: "absolute",
            left: "50%", top: 0, bottom: 0,
            width: 1, background: "var(--border)",
          }} />

          <div className="aiq-who-col" style={{ paddingRight: 56 }}>
            <h3 style={{
              fontFamily: "var(--display)", fontWeight: 400,
              fontSize: "clamp(1.8rem, 3vw, 2.4rem)",
              lineHeight: 1.08, letterSpacing: "-0.02em",
              color: "var(--ink-deep)", margin: 0,
            }}>
              Who uses{" "}
              <span style={{
                fontStyle: "italic", color: "var(--ink)",
                borderBottom: "3px solid var(--signal)", paddingBottom: 2,
              }}>it</span>.
            </h3>
            <p style={{
              fontFamily: "var(--sans)", fontSize: 16, lineHeight: 1.55,
              color: "var(--text-2)", letterSpacing: "-0.003em",
              margin: "14px 0 0", maxWidth: "38ch",
            }}>
              Built for anyone making a location decision, from first-time buyers to property funds. Hours of research, in seconds.
            </p>

            <div style={{
              marginTop: 32, paddingTop: 4,
            }}>
              {WHO_ITEMS.map((item, i) => (
                <WhoWhyItem key={item.title} item={item} first={i === 0} />
              ))}
            </div>
          </div>

          <div className="aiq-why-col" style={{ paddingLeft: 56 }}>
            <h3 style={{
              fontFamily: "var(--display)", fontWeight: 400,
              fontSize: "clamp(1.8rem, 3vw, 2.4rem)",
              lineHeight: 1.08, letterSpacing: "-0.02em",
              color: "var(--ink-deep)", margin: 0,
            }}>
              Why use{" "}
              <span style={{
                fontStyle: "italic", color: "var(--ink)",
                borderBottom: "3px solid var(--signal)", paddingBottom: 2,
              }}>it</span>.
            </h3>
            <p style={{
              fontFamily: "var(--sans)", fontSize: 16, lineHeight: 1.55,
              color: "var(--text-2)", letterSpacing: "-0.003em",
              margin: "14px 0 0", maxWidth: "38ch",
            }}>
              Not another postcode lookup. We score, weigh, and explain. For your specific use case.
            </p>

            <div style={{
              marginTop: 32, paddingTop: 4,
            }}>
              {WHY_ITEMS.map((item, i) => (
                <WhoWhyItem key={item.title} item={item} first={i === 0} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function WhoWhyItem({
  item, first,
}: {
  item: { icon: IconName; title: string; body: string };
  first: boolean;
}) {
  return (
    <div style={{
      padding: "20px 0",
      borderTop: first ? "1px solid var(--border)" : "1px solid var(--border-dim)",
      display: "grid",
      gridTemplateColumns: "34px 1fr",
      gap: 18,
      alignItems: "start",
    }}>
      <div style={{
        paddingTop: 2,
      }}>
        <AiqIcon name={item.icon} size={24} />
      </div>
      <div>
        <h4 style={{
          fontFamily: "var(--display)", fontWeight: 500,
          fontSize: 18, lineHeight: 1.2, letterSpacing: "-0.015em",
          color: "var(--ink-deep)", margin: 0,
        }}>{item.title}</h4>
        <p style={{
          fontFamily: "var(--sans)", fontSize: 14.5, lineHeight: 1.55,
          color: "var(--text-2)", letterSpacing: "-0.003em",
          margin: "6px 0 0",
        }}>{item.body}</p>
      </div>
    </div>
  );
}

/* ─────── Inside a report · full anatomy of what the product outputs ─────── */

function InsideReport() {
  return (
    <section style={{
      background: "var(--bg)",
      borderTop: "1px solid var(--border)",
      padding: "104px 0 120px",
    }}>
      <div style={{ maxWidth: 940, margin: "0 auto", padding: "0 40px" }}>
        {/* Heading */}
        <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto 56px" }}>
          <div style={{
            fontFamily: "var(--mono)", fontSize: 11,
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: "var(--text-3)", marginBottom: 18,
          }}>What's in a report</div>
          <h2 style={{
            fontFamily: "var(--display)", fontWeight: 400,
            fontSize: "clamp(1.9rem, 3.6vw, 2.8rem)",
            lineHeight: 1.08, letterSpacing: "-0.02em",
            color: "var(--ink-deep)", margin: 0,
          }}>
            Score, story,{" "}
            <span style={{
              fontStyle: "italic", color: "var(--ink)",
              borderBottom: "3px solid var(--signal)", paddingBottom: 2,
            }}>evidence</span>,{" "}
            next steps.
          </h2>
          <p style={{
            fontFamily: "var(--sans)", fontSize: 16.5, lineHeight: 1.55,
            color: "var(--text-2)", letterSpacing: "-0.003em",
            margin: "20px auto 0", maxWidth: "48ch",
          }}>
            A narrated read written for your intent: property market, schools,
            crime trends, and specific recommendations. Not a scorecard.
          </p>
        </div>

        {/* Report mockup · full anatomy */}
        <article style={{
          background: "var(--bg)",
          border: "1px solid var(--ink-deep)",
          borderRadius: 6,
          boxShadow: "0 30px 70px rgba(6,42,30,0.12), 0 6px 14px rgba(6,42,30,0.05)",
          overflow: "hidden",
        }}>
          <IRHeader />
          <IRSummary />
          <IRScoreBlock />
          <IRPropertyMarket />
          <IRNarrativeBlock />
          <IRSchools />
          <IRRecommendations />
          <IRFooter />
        </article>
      </div>
    </section>
  );
}

/* ── Inside Report sub-components ── */

const IR_DIMS = [
  { label: "Safety & Crime",      score: 80, weight: 25, reason: "10 crimes / 90d · 3 per month · low for urban" },
  { label: "Schools & Education", score: 95, weight: 20, reason: "25 schools within 1.5km · Ofsted indexed" },
  { label: "Transport & Commute", score: 95, weight: 20, reason: "6 rail + 43 bus stops within 2km" },
  { label: "Daily Amenities",     score: 95, weight: 15, reason: "3,579 within 1km · 593 food · 167 parks" },
  { label: "Cost of Living",      score: 58, weight: 20, reason: "IMD 2025 decile 5 · mid-market band" },
];

function IRHeader() {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      gap: 14, flexWrap: "wrap",
      padding: "16px 28px",
      background: "var(--bg-off)",
      borderBottom: "1px solid var(--border)",
      fontFamily: "var(--mono)", fontSize: 10,
      letterSpacing: "0.22em", textTransform: "uppercase",
    }}>
      <span style={{ color: "var(--ink)", display: "inline-flex", alignItems: "center", gap: 10 }}>
        <Mark size={14} />
        OneGoodArea report
      </span>
      <span style={{ color: "var(--text-3)" }}>22 Apr 2026 · full sample</span>
    </div>
  );
}

function IRSummary() {
  return (
    <div style={{ padding: "32px 40px 28px" }}>
      <div style={{
        fontFamily: "var(--mono)", fontSize: 10,
        letterSpacing: "0.22em", textTransform: "uppercase",
        color: "var(--text-3)", marginBottom: 14,
      }}>
        Manchester · M1 1AE · scored for{" "}
        <span style={{ color: "var(--ink)", fontWeight: 500 }}>moving home</span>
      </div>
      <h3 style={{
        fontFamily: "var(--display)", fontStyle: "italic", fontWeight: 400,
        fontSize: "clamp(1.9rem, 3.4vw, 2.6rem)", lineHeight: 1.08,
        letterSpacing: "-0.02em", color: "var(--ink-deep)", margin: 0,
      }}>
        Strong fit<span style={{ borderBottom: "3px solid var(--signal)", paddingBottom: 2 }}>.</span>
      </h3>
      <p style={{
        fontFamily: "var(--sans)", fontSize: 16.5, lineHeight: 1.6,
        color: "var(--ink-deep)", letterSpacing: "-0.003em",
        margin: "18px 0 0", maxWidth: "62ch",
      }}>
        Manchester does what a move home needs. Transport is exceptional,{" "}
        <IRMark>3,579 amenities within a kilometre</IRMark>, and safety reads strong
        for a city core. The trade-off is cost. You're paying mid-market for
        genuine urban convenience.
      </p>
    </div>
  );
}

function IRMark({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      background: "var(--signal-dim)",
      padding: "1px 5px", borderRadius: 2,
      fontWeight: 600, fontSize: "0.96em",
      letterSpacing: "-0.005em",
      whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

function IRSectionHead({ eyebrow, title, meta }: { eyebrow: string; title: string; meta?: string }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "baseline",
      gap: 16, flexWrap: "wrap", marginBottom: 18,
    }}>
      <div>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: "var(--ink)", marginBottom: 6,
        }}>{eyebrow}</div>
        <h4 style={{
          fontFamily: "var(--display)", fontWeight: 400,
          fontSize: 22, lineHeight: 1.12, letterSpacing: "-0.015em",
          color: "var(--ink-deep)", margin: 0,
        }}>{title}</h4>
      </div>
      {meta && (
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10,
          letterSpacing: "0.18em", textTransform: "uppercase",
          color: "var(--text-3)",
        }}>{meta}</div>
      )}
    </div>
  );
}

function IRScoreBlock() {
  return (
    <div style={{
      padding: "28px 40px 32px",
      borderTop: "1px dashed var(--border)",
      display: "grid",
      gridTemplateColumns: "minmax(0, 220px) minmax(0, 1fr)",
      gap: 40, alignItems: "center",
    }}>
      {/* Score ring */}
      <div style={{
        position: "relative", width: 180, height: 180, justifySelf: "center",
      }}>
        <svg width="180" height="180" viewBox="0 0 180 180">
          <circle cx="90" cy="90" r="78" fill="none" stroke="var(--border-dim)" strokeWidth="8" />
          <circle
            cx="90" cy="90" r="78" fill="none"
            stroke="var(--ink)" strokeWidth="8"
            strokeDasharray={`${(84 / 100) * 490} 490`}
            strokeLinecap="round"
            transform="rotate(-90 90 90)"
          />
          <circle
            cx="90" cy="90" r="78" fill="none"
            stroke="var(--signal)" strokeWidth="3"
            strokeDasharray={`${(84 / 100) * 490} 490`}
            strokeLinecap="round"
            transform="rotate(-90 90 90)"
            style={{ opacity: 0.7 }}
          />
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            fontFamily: "var(--display)", fontSize: 54, lineHeight: 1,
            color: "var(--ink-deep)", letterSpacing: "-0.04em",
            fontVariantNumeric: "tabular-nums",
          }}>84</div>
          <div style={{
            fontFamily: "var(--mono)", fontSize: 9,
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: "var(--text-3)", marginTop: 4,
          }}>of 100</div>
        </div>
      </div>

      {/* Dimensions */}
      <div>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: "var(--ink)", marginBottom: 12, fontWeight: 500,
        }}>Five weighted dimensions</div>
        {IR_DIMS.map((d, i) => {
          const rag = d.score >= 70 ? "var(--ink)" : d.score >= 45 ? "#E2C94A" : "#E97451";
          return (
            <div key={d.label} style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) 80px 32px 40px",
              gap: 12, alignItems: "center",
              padding: "6px 0",
              borderBottom: i < IR_DIMS.length - 1 ? "1px solid var(--border-dim)" : "none",
            }}>
              <div>
                <div style={{
                  fontFamily: "var(--sans)", fontSize: 13, fontWeight: 500,
                  color: "var(--ink-deep)",
                }}>{d.label}</div>
                <div style={{
                  fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-3)",
                  marginTop: 2, letterSpacing: "0.02em",
                }}>{d.reason}</div>
              </div>
              <div style={{
                height: 4, background: "var(--border-dim)",
                borderRadius: 999, overflow: "hidden",
              }}>
                <div style={{ width: `${d.score}%`, height: "100%", background: rag, borderRadius: 999 }} />
              </div>
              <div style={{
                fontFamily: "var(--mono)", fontSize: 12, fontWeight: 500,
                color: "var(--ink-deep)", textAlign: "right",
                fontVariantNumeric: "tabular-nums",
              }}>{d.score}</div>
              <div style={{
                fontFamily: "var(--mono)", fontSize: 9, fontWeight: 600,
                color: "var(--ink-deep)", background: "var(--signal-dim)",
                padding: "2px 5px", borderRadius: 2,
                textAlign: "center", letterSpacing: "0.04em",
              }}>w{d.weight}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IRPropertyMarket() {
  const stats = [
    { label: "Median price",    value: "£245k",  detail: "last 24 months" },
    { label: "YoY change",      value: "+4.2%",  detail: "versus previous 12" },
    { label: "Transactions",    value: "124",    detail: "in the outcode" },
    { label: "Most common",     value: "Terrace", detail: "£198k median" },
  ];
  return (
    <div style={{
      padding: "28px 40px",
      borderTop: "1px dashed var(--border)",
    }}>
      <IRSectionHead
        eyebrow="Property market"
        title="Where the money sits."
        meta="HM Land Registry · 24mo"
      />
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: 20,
      }}>
        {stats.map((s) => (
          <div key={s.label}>
            <div style={{
              fontFamily: "var(--display)", fontWeight: 400,
              fontSize: 26, lineHeight: 1, letterSpacing: "-0.025em",
              color: "var(--ink-deep)", fontVariantNumeric: "tabular-nums",
            }}>{s.value}</div>
            <div style={{
              fontFamily: "var(--mono)", fontSize: 9,
              letterSpacing: "0.18em", textTransform: "uppercase",
              color: "var(--ink)", marginTop: 8, fontWeight: 500,
            }}>{s.label}</div>
            <div style={{
              fontFamily: "var(--sans)", fontSize: 12, color: "var(--text-3)",
              marginTop: 3, letterSpacing: "-0.003em",
            }}>{s.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function IRNarrativeBlock() {
  return (
    <div style={{
      padding: "28px 40px",
      borderTop: "1px dashed var(--border)",
    }}>
      <IRSectionHead eyebrow="Transport & amenities" title="A thirty-minute city." />
      <p style={{
        fontFamily: "var(--sans)", fontSize: 15.5, lineHeight: 1.65,
        color: "var(--ink-deep)", letterSpacing: "-0.003em",
        margin: 0, maxWidth: "64ch",
      }}>
        The area sits on top of <IRMark>6 rail and tube stations</IRMark> within 2km
        (Ardwick, Piccadilly, Oxford Road) plus <IRMark>43 bus stops inside 500 metres</IRMark>.
        Combined with <IRMark>3,579 daily amenities in a kilometre</IRMark> (593 food,
        167 parks, 42 healthcare), most of the city is inside a half-hour commute on
        foot or on transit. For a move home, this is rare density outside of Zone 1-2 London.
      </p>
      <div style={{
        fontFamily: "var(--mono)", fontSize: 10,
        letterSpacing: "0.18em", textTransform: "uppercase",
        color: "var(--text-3)", marginTop: 14,
      }}>
        3 more sections in the full report →
      </div>
    </div>
  );
}

function IRSchools() {
  const ratings = [
    { label: "Outstanding", count: 5, color: "var(--ink)" },
    { label: "Good",        count: 14, color: "var(--ink)" },
    { label: "Requires imp.", count: 2, color: "#E2C94A" },
    { label: "Inadequate",  count: 0, color: "#E97451" },
  ];
  const total = ratings.reduce((s, r) => s + r.count, 0);
  const topSchools = [
    { name: "Manchester Academy",       rating: "Outstanding", distance: "0.6km" },
    { name: "Chorlton High School",     rating: "Good",        distance: "1.1km" },
    { name: "St Augustine's RC Primary", rating: "Good",       distance: "1.4km" },
  ];
  return (
    <div style={{
      padding: "28px 40px",
      borderTop: "1px dashed var(--border)",
    }}>
      <IRSectionHead
        eyebrow="Nearby schools"
        title="Twenty-one rated schools within 1.5km."
        meta="Ofsted"
      />
      {/* Distribution bar */}
      <div style={{
        display: "flex", height: 10, borderRadius: 2,
        overflow: "hidden", background: "var(--border-dim)",
        marginBottom: 12,
      }}>
        {ratings.map((r) => (
          r.count > 0 && (
            <div key={r.label} style={{
              width: `${(r.count / total) * 100}%`,
              background: r.color,
              opacity: r.label === "Good" ? 0.75 : r.label === "Outstanding" ? 1 : 0.8,
            }} />
          )
        ))}
      </div>
      <div style={{
        display: "flex", gap: 16, flexWrap: "wrap",
        fontFamily: "var(--mono)", fontSize: 10,
        letterSpacing: "0.14em", textTransform: "uppercase",
        color: "var(--text-3)",
        marginBottom: 16,
      }}>
        {ratings.map((r) => (
          <span key={r.label} style={{
            display: "inline-flex", alignItems: "center", gap: 6,
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: 2, background: r.color,
              opacity: r.label === "Good" ? 0.75 : r.label === "Outstanding" ? 1 : 0.8,
            }} />
            {r.label} · {r.count}
          </span>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {topSchools.map((s) => (
          <div key={s.name} style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 120px) 60px",
            gap: 14, alignItems: "baseline",
            padding: "6px 0",
            borderBottom: "1px solid var(--border-dim)",
            fontFamily: "var(--sans)", fontSize: 13,
            color: "var(--ink-deep)",
          }}>
            <div style={{ fontWeight: 500 }}>{s.name}</div>
            <div style={{
              fontFamily: "var(--mono)", fontSize: 10,
              letterSpacing: "0.12em", color: "var(--ink)",
              textTransform: "uppercase", fontWeight: 500,
            }}>{s.rating}</div>
            <div style={{
              fontFamily: "var(--mono)", fontSize: 11,
              color: "var(--text-3)", textAlign: "right",
              fontVariantNumeric: "tabular-nums",
            }}>{s.distance}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function IRRecommendations() {
  const recs = [
    {
      n: "01",
      title: "Target terrace or 2-bed flats in the £180–260k band.",
      detail: "Best match for local median. Detached at £412k sits above budget for most first-move buyers.",
    },
    {
      n: "02",
      title: "Prioritise Chorlton, Didsbury, or Ancoats for school catchment.",
      detail: "Three Outstanding-rated primaries sit within a 1.5km radius of the city core.",
    },
    {
      n: "03",
      title: "Check the flood overlay before committing on the River Mersey corridor.",
      detail: "Ten flood zones within 3km cluster along the Mersey and Irwell. Mostly low-risk, but insurance premiums vary.",
    },
  ];
  return (
    <div style={{
      padding: "28px 40px",
      borderTop: "1px dashed var(--border)",
    }}>
      <IRSectionHead eyebrow="What to do next" title="Three concrete moves." />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {recs.map((r) => (
          <div key={r.n} style={{
            display: "grid",
            gridTemplateColumns: "34px minmax(0, 1fr)",
            gap: 14, alignItems: "baseline",
          }}>
            <div style={{
              fontFamily: "var(--display)", fontStyle: "italic",
              fontSize: 20, lineHeight: 1, color: "var(--ink)",
              letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums",
              paddingTop: 2,
            }}>{r.n}</div>
            <div>
              <div style={{
                fontFamily: "var(--display)", fontWeight: 400,
                fontSize: 17, lineHeight: 1.3, letterSpacing: "-0.015em",
                color: "var(--ink-deep)",
              }}>{r.title}</div>
              <div style={{
                fontFamily: "var(--sans)", fontSize: 13.5, lineHeight: 1.55,
                color: "var(--text-2)", letterSpacing: "-0.003em",
                marginTop: 4,
              }}>{r.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function IRFooter() {
  const sources = [
    "Police.uk", "IMD 2025", "OpenStreetMap",
    "Environment Agency", "HM Land Registry", "Ofsted", "Postcodes.io",
  ];
  const actions = [
    { label: "PDF export",       icon: "↓" },
    { label: "Shareable link",   icon: "↗" },
    { label: "Save to watchlist", icon: "★" },
  ];
  return (
    <div style={{
      padding: "22px 40px 26px",
      borderTop: "1px solid var(--border)",
      background: "var(--bg-off)",
    }}>
      <div style={{
        display: "flex", gap: 10, flexWrap: "wrap",
        marginBottom: 14,
      }}>
        {sources.map((s) => (
          <span key={s} style={{
            fontFamily: "var(--mono)", fontSize: 9, fontWeight: 500,
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: "var(--text-2)", background: "var(--bg)",
            border: "1px solid var(--border)",
            padding: "4px 8px", borderRadius: 2,
          }}>{s}</span>
        ))}
      </div>
      <div style={{
        display: "flex", gap: 16, flexWrap: "wrap",
        justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {actions.map((a) => (
            <span key={a.label} style={{
              fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
              letterSpacing: "0.18em", textTransform: "uppercase",
              color: "var(--ink)",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
              <span style={{
                width: 18, height: 18, borderRadius: 2,
                background: "var(--signal-dim)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                color: "var(--ink-deep)", fontSize: 11,
              }}>{a.icon}</span>
              {a.label}
            </span>
          ))}
        </div>
        <span style={{
          fontFamily: "var(--mono)", fontSize: 9,
          letterSpacing: "0.18em", textTransform: "uppercase",
          color: "var(--text-3)",
        }}>ref · 84 of 100 · Manchester · moving home</span>
      </div>
    </div>
  );
}

/* ─────── For businesses · REST API + embeddable widget ─────── */

function ForBusinessesSection() {
  return (
    <section id="embed-it" style={{
      background: "var(--bg-ink)",
      borderTop: "1px solid var(--ink)",
      padding: "104px 0 120px",
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ textAlign: "center", maxWidth: 700, margin: "0 auto 80px" }}>
          <div style={{
            fontFamily: "var(--mono)", fontSize: 11,
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: "var(--signal)", marginBottom: 22,
            display: "inline-flex", alignItems: "center", gap: 9,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "var(--signal)",
              animation: "aiq-pulse-dot 2s ease-in-out infinite",
            }} />
            For businesses
          </div>
          <h2 style={{
            fontFamily: "var(--display)", fontWeight: 400,
            fontSize: "clamp(1.9rem, 3.6vw, 2.8rem)",
            lineHeight: 1.08, letterSpacing: "-0.02em",
            color: "#F4F8F2", margin: 0,
          }}>
            The same engine,{" "}
            <span style={{
              fontStyle: "italic", color: "#F4F8F2",
              borderBottom: "3px solid var(--signal)", paddingBottom: 2,
            }}>inside your product</span>.
          </h2>
          <p style={{
            fontFamily: "var(--sans)", fontSize: 17, lineHeight: 1.55,
            color: "#A7BFB4", letterSpacing: "-0.003em",
            margin: "26px auto 0", maxWidth: "56ch",
          }}>
            Ship area intelligence in under fifty lines. A REST API and a drop-in widget, both returning the same read.
          </p>
        </div>

        <FBRow
          reverse={false}
          number="01"
          eyebrow="REST API"
          title="Bearer auth. JSON out."
          body="Call any UK postcode with an intent. Get scores, dimensions, reasoning, and source citations back as structured JSON. Same payload that renders on this site."
          bullets={[
            "Four intents. Five weighted dimensions per intent",
            "Source attribution on every dimension",
            "Tiered plans from free to enterprise",
          ]}
          visual={<FBApiPanel />}
        />

        <div aria-hidden style={{
          height: 1, background: "rgba(212,243,58,0.16)",
          margin: "72px 0", position: "relative",
        }}>
          <span style={{
            position: "absolute", left: "50%", top: -5,
            width: 10, height: 10, borderRadius: "50%",
            background: "var(--signal)",
            transform: "translateX(-50%)",
            boxShadow: "0 0 0 4px var(--ink-deep)",
          }} />
        </div>

        <FBRow
          reverse
          number="02"
          eyebrow="Drop-in widget"
          title="One script tag. Zero backend."
          body="For property platforms, relocation apps, and CRM tools. Drop a single tag next to a listing and show the area read in context."
          bullets={[
            "Light or dark theme, or matched to your brand",
            "Responsive from 280px upwards. No layout shift",
            "Same engine, same data, same narrative",
          ]}
          visual={<FBWidgetPanel />}
        />
      </div>
    </section>
  );
}

function FBRow({
  reverse, number, eyebrow, title, body, bullets, visual,
}: {
  reverse: boolean;
  number: string;
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  visual: React.ReactNode;
}) {
  const copy = (
    <div>
      <div style={{
        fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
        letterSpacing: "0.22em", color: "var(--signal)",
        marginBottom: 14, textTransform: "uppercase",
      }}>{number} · {eyebrow}</div>
      <h3 style={{
        fontFamily: "var(--display)", fontWeight: 400,
        fontSize: "clamp(1.55rem, 2.4vw, 2rem)", lineHeight: 1.12,
        letterSpacing: "-0.018em", color: "#F4F8F2", margin: 0,
      }}>{title}</h3>
      <p style={{
        fontFamily: "var(--sans)", fontSize: 15.5, lineHeight: 1.6,
        color: "#A7BFB4", letterSpacing: "-0.003em",
        margin: "18px 0 0", maxWidth: "46ch",
      }}>{body}</p>
      <ul style={{ listStyle: "none", padding: 0, margin: "28px 0 0" }}>
        {bullets.map((b, i) => (
          <li key={i} style={{
            fontFamily: "var(--sans)", fontSize: 14, lineHeight: 1.5,
            color: "#C2D5CA", padding: "11px 0",
            borderTop: i === 0
              ? "1px solid rgba(255,255,255,0.10)"
              : "1px solid rgba(255,255,255,0.06)",
            display: "grid", gridTemplateColumns: "14px 1fr", gap: 12, alignItems: "start",
          }}>
            <span aria-hidden style={{
              width: 5, height: 5, borderRadius: "50%",
              background: "var(--signal)", marginTop: 8,
            }} />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <div className="aiq-hiw-row" style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 64,
      alignItems: "center",
      padding: "4px 0",
    }}>
      {reverse ? <>{visual}{copy}</> : <>{copy}{visual}</>}
    </div>
  );
}

function FBApiPanel() {
  return (
    <div style={{
      background: "#04201A",
      border: "1px solid rgba(212,243,58,0.18)",
      borderRadius: 4,
      overflow: "hidden",
      boxShadow: "0 24px 44px -22px rgba(0,0,0,0.55)",
    }}>
      <div style={{
        padding: "11px 16px",
        background: "rgba(0,0,0,0.28)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{ display: "flex", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.14)" }} />
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.14)" }} />
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.14)" }} />
        </div>
        <span style={{
          fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
          letterSpacing: "0.16em", textTransform: "uppercase",
          color: "var(--signal)", marginLeft: 10,
          display: "inline-flex", alignItems: "center", gap: 6,
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: "50%",
            background: "var(--signal)",
            animation: "aiq-pulse-dot 2s ease-in-out infinite",
          }} />
          Live
        </span>
        <span style={{
          fontFamily: "var(--mono)", fontSize: 10.5,
          color: "rgba(255,255,255,0.4)", marginLeft: "auto",
        }}>POST /v1/score</span>
      </div>
      <pre style={{
        margin: 0, padding: "20px 22px 22px",
        fontFamily: "var(--mono)", fontSize: 12.5, lineHeight: 1.75,
        color: "#C2D5CA",
        whiteSpace: "pre", overflowX: "auto",
      }}>
{`$ curl https://api.area-iq.co.uk/v1/score \\
  -H `}<span style={{color:"var(--signal-dim)"}}>{`"Authorization: Bearer aiq_live_••••"`}</span>{` \\
  -H `}<span style={{color:"var(--signal-dim)"}}>{`"Content-Type: application/json"`}</span>{` \\
  -d `}<span style={{color:"var(--signal-dim)"}}>{`'{ "postcode": "M1 1AD", "intent": "moving" }'`}</span>{`

`}<span style={{color:"rgba(255,255,255,0.34)"}}>{`# 200 OK`}</span>{`
{
  `}<span style={{color:"#8DC3A8"}}>{`"area"`}</span>{`:       `}<span style={{color:"var(--signal-dim)"}}>{`"Manchester, M1"`}</span>{`,
  `}<span style={{color:"#8DC3A8"}}>{`"intent"`}</span>{`:     `}<span style={{color:"var(--signal-dim)"}}>{`"moving"`}</span>{`,
  `}<span style={{color:"#8DC3A8"}}>{`"verdict"`}</span>{`:    `}<span style={{color:"var(--signal-dim)"}}>{`"Strong fit"`}</span>{`,
  `}<span style={{color:"#8DC3A8"}}>{`"score"`}</span>{`:      `}<span style={{color:"var(--signal)"}}>{`84`}</span>{`,
  `}<span style={{color:"#8DC3A8"}}>{`"dimensions"`}</span>{`: [ … ],
  `}<span style={{color:"#8DC3A8"}}>{`"narrative"`}</span>{`:  `}<span style={{color:"var(--signal-dim)"}}>{`"Manchester's M1 is …"`}</span>{`,
  `}<span style={{color:"#8DC3A8"}}>{`"sources"`}</span>{`:    [ 7 ]
}`}
      </pre>
    </div>
  );
}

function FBWidgetPanel() {
  const dims: { l: string; s: number }[] = [
    { l: "Safety",    s: 72 },
    { l: "Transport", s: 91 },
    { l: "Amenities", s: 88 },
    { l: "Schools",   s: 81 },
    { l: "Cost",      s: 78 },
  ];
  return (
    <div className="aiq-force-light" style={{
      background: "#FFFFFF",
      border: "1px solid rgba(212,243,58,0.22)",
      borderRadius: 4,
      overflow: "hidden",
      boxShadow: "0 24px 44px -22px rgba(0,0,0,0.55)",
    }}>
      <div style={{
        padding: "10px 14px",
        background: "#F2F4F0",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{ display: "flex", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#D0D5D0" }} />
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#D0D5D0" }} />
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#D0D5D0" }} />
        </div>
        <span style={{
          flex: 1, marginLeft: 10,
          fontFamily: "var(--mono)", fontSize: 10.5,
          color: "var(--text-3)",
          background: "#FFFFFF",
          border: "1px solid var(--border)",
          padding: "4px 10px", borderRadius: 3,
          overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
        }}>realestate.co.uk/listing/manchester-m1-apartments</span>
      </div>

      <div style={{ padding: "22px 22px 18px", background: "var(--bg-off)" }}>
        <div style={{
          fontFamily: "var(--display)", fontSize: 17, fontWeight: 500,
          color: "var(--ink-deep)", letterSpacing: "-0.01em",
          margin: "0 0 4px",
        }}>2-Bed Apartment · M1 1AD</div>
        <div style={{
          fontFamily: "var(--sans)", fontSize: 12.5,
          color: "var(--text-3)", marginBottom: 14,
        }}>Northern Quarter, Manchester · £1,450 pcm</div>
        <div style={{
          height: 60, background: "var(--border-dim)",
          borderRadius: 2, marginBottom: 16,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--mono)", fontSize: 9, color: "var(--text-4)",
          letterSpacing: "0.2em", textTransform: "uppercase",
        }}>listing photos</div>

        <div style={{
          background: "#FFFFFF",
          border: "1px solid var(--border)",
          borderRadius: 3,
          overflow: "hidden",
          position: "relative",
        }}>
          <div aria-hidden style={{
            position: "absolute", top: 0, left: 0, right: 0,
            height: 2, background: "var(--signal)",
          }} />
          <div style={{ padding: "16px 18px" }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 12,
            }}>
              <div style={{
                fontFamily: "var(--mono)", fontSize: 9, fontWeight: 500,
                letterSpacing: "0.2em", textTransform: "uppercase",
                color: "var(--ink)",
                display: "inline-flex", alignItems: "center", gap: 7,
              }}>
                <Mark size={14} /> OneGoodArea · for moving
              </div>
              <span style={{
                fontFamily: "var(--mono)", fontSize: 9,
                color: "var(--text-3)", letterSpacing: "0.08em",
              }}>M1 1AD</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 14 }}>
              <div style={{
                fontFamily: "var(--display)", fontSize: 36, fontWeight: 500,
                color: "var(--ink-deep)", letterSpacing: "-0.02em",
                lineHeight: 1,
              }}>84</div>
              <div>
                <div style={{
                  fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600,
                  color: "var(--ink-deep)", letterSpacing: "-0.003em",
                }}>Strong fit</div>
                <div style={{
                  fontFamily: "var(--mono)", fontSize: 9,
                  letterSpacing: "0.14em", textTransform: "uppercase",
                  color: "var(--text-3)",
                }}>out of 100</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {dims.map((d) => (
                <div key={d.l} style={{
                  display: "grid", gridTemplateColumns: "74px 1fr 24px",
                  gap: 10, alignItems: "center",
                }}>
                  <span style={{
                    fontFamily: "var(--mono)", fontSize: 9, fontWeight: 500,
                    color: "var(--text-2)",
                    letterSpacing: "0.06em",
                  }}>{d.l}</span>
                  <div style={{
                    height: 3, background: "var(--border-dim)",
                    overflow: "hidden", borderRadius: 2,
                  }}>
                    <div style={{
                      height: "100%", width: `${d.s}%`,
                      background: d.s >= 85 ? "var(--signal)" : "var(--ink)",
                    }} />
                  </div>
                  <span style={{
                    fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
                    color: "var(--ink)", textAlign: "right",
                  }}>{d.s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{
        padding: "14px 18px",
        background: "#04201A",
        borderTop: "1px solid rgba(212,243,58,0.18)",
        fontFamily: "var(--mono)", fontSize: 11.5, lineHeight: 1.5,
        color: "#C2D5CA",
        overflowX: "auto",
        whiteSpace: "nowrap",
      }}>
        <span style={{color:"rgba(255,255,255,0.36)"}}>{`<`}</span><span style={{color:"var(--signal-dim)"}}>{`area-iq`}</span>{` `}
        <span style={{color:"#8DC3A8"}}>postcode</span>=<span style={{color:"var(--signal-dim)"}}>{`"M1 1AD"`}</span>{` `}
        <span style={{color:"#8DC3A8"}}>intent</span>=<span style={{color:"var(--signal-dim)"}}>{`"moving"`}</span>{` `}
        <span style={{color:"rgba(255,255,255,0.36)"}}>{`/>`}</span>
      </div>
    </div>
  );
}

/* ─────── Final CTA · one last call to the hero form ─────── */

function FinalCTA() {
  function scrollToTop(e: React.MouseEvent) {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  return (
    <section id="start" style={{
      background: "var(--bg)",
      borderTop: "1px solid var(--border)",
      padding: "112px 0 128px",
    }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 40px", textAlign: "center" }}>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 11,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: "var(--ink)", marginBottom: 22,
          display: "inline-flex", alignItems: "center", gap: 8,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "var(--signal)",
            animation: "aiq-pulse-dot 2s ease-in-out infinite",
          }} />
          Start
        </div>
        <h2 style={{
          fontFamily: "var(--display)", fontWeight: 400,
          fontSize: "clamp(2.1rem, 4.4vw, 3.4rem)",
          lineHeight: 1.04, letterSpacing: "-0.025em",
          color: "var(--ink-deep)", margin: 0,
        }}>
          One postcode.{" "}
          <span style={{
            fontStyle: "italic", color: "var(--ink)",
            borderBottom: "3px solid var(--signal)", paddingBottom: 2,
          }}>The full read</span>.
        </h2>
        <p style={{
          fontFamily: "var(--sans)", fontSize: 17, lineHeight: 1.5,
          color: "var(--text-2)", letterSpacing: "-0.003em",
          margin: "28px auto 0", maxWidth: "50ch",
        }}>
          Type a UK place, pick why you&apos;re looking, and get the intelligence report in seconds.
        </p>
        <div style={{
          display: "flex", gap: 12, justifyContent: "center",
          marginTop: 40, flexWrap: "wrap",
        }}>
          <a href="#" onClick={scrollToTop} style={{
            fontFamily: "var(--sans)", fontSize: 14, fontWeight: 600,
            letterSpacing: "-0.005em",
            color: "var(--ink-deep)", background: "var(--signal)",
            padding: "14px 24px", borderRadius: 3,
            textDecoration: "none",
            display: "inline-flex", alignItems: "center", gap: 9,
            transition: "transform 140ms ease, box-shadow 140ms ease",
            boxShadow: "0 6px 18px -8px rgba(212,243,58,0.55)",
          }}>
            Try a postcode
            <span aria-hidden>→</span>
          </a>
          <a href="#embed-it" style={{
            fontFamily: "var(--sans)", fontSize: 14, fontWeight: 500,
            letterSpacing: "-0.005em",
            color: "var(--ink)", background: "transparent",
            border: "1px solid var(--border)",
            padding: "13px 22px", borderRadius: 3,
            textDecoration: "none",
            display: "inline-flex", alignItems: "center", gap: 8,
            transition: "border-color 140ms, background 140ms",
          }}>
            See the API
            <span aria-hidden style={{ color: "var(--text-3)" }}>→</span>
          </a>
        </div>
        <div style={{
          marginTop: 56, paddingTop: 22,
          borderTop: "1px solid var(--border-dim)",
          fontFamily: "var(--mono)", fontSize: 10,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: "var(--text-3)",
        }}>
          42,640 UK neighbourhoods · free to try · any UK postcode
        </div>
      </div>
    </section>
  );
}

